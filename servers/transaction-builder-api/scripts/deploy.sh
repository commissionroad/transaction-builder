#!/usr/bin/env bash

set -euo pipefail

: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID to the AWS account that owns the ECR repository}"
: "${DATABASE_SECRET_ARN:?Set DATABASE_SECRET_ARN to the Secrets Manager ARN containing DATABASE_URL}"
: "${ECS_EXECUTION_ROLE_ARN:?Set ECS_EXECUTION_ROLE_ARN to the ECS task execution role ARN}"

AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY="${ECR_REPOSITORY:-transaction-builder-api}"
ECS_CLUSTER="${ECS_CLUSTER:-commissionroad}"
ECS_SERVICE="${ECS_SERVICE:-transaction-builder-api}"
CONTAINER_NAME="${CONTAINER_NAME:-transaction-builder-api}"
TASK_FAMILY="${TASK_FAMILY:-transaction-builder-api}"
LOG_GROUP="${LOG_GROUP:-/ecs/transaction-builder-api}"
ECS_TASK_ROLE_ARN="${ECS_TASK_ROLE_ARN:-$ECS_EXECUTION_ROLE_ARN}"

GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
IMAGE_TAG="$(date +%Y%m%d-%H%M%S)-${GIT_SHA}"
ECR_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

echo "Building transaction-builder-api ${IMAGE_TAG}"
bun run --filter @transaction-builder/domain build
bun run --filter @transaction-builder/database build
bun run --cwd packages/transaction-builder-database build:migrate
bun run --filter transaction-builder-api build

echo "Building linux/amd64 Docker image"
docker buildx build --platform linux/amd64 \
  --build-arg GIT_COMMIT_SHA="${GIT_SHA}" \
  --build-arg BUILD_TIME="${BUILD_TIME}" \
  -t "${ECR_REPOSITORY}:${IMAGE_TAG}" \
  -f servers/transaction-builder-api/Dockerfile \
  . \
  --load

echo "Logging into ECR"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Pushing image"
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_IMAGE}:${IMAGE_TAG}"
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_IMAGE}:latest"
docker push "${ECR_IMAGE}:${IMAGE_TAG}"
docker push "${ECR_IMAGE}:latest"

tmp_task_def="$(mktemp)"
new_image="${ECR_IMAGE}:${IMAGE_TAG}"

jq \
  --arg CONTAINER_NAME "${CONTAINER_NAME}" \
  --arg DATABASE_SECRET_ARN "${DATABASE_SECRET_ARN}" \
  --arg ECS_EXECUTION_ROLE_ARN "${ECS_EXECUTION_ROLE_ARN}" \
  --arg ECS_TASK_ROLE_ARN "${ECS_TASK_ROLE_ARN}" \
  --arg IMAGE "${new_image}" \
  --arg LOG_GROUP "${LOG_GROUP}" \
  --arg TASK_FAMILY "${TASK_FAMILY}" \
  --arg AWS_REGION "${AWS_REGION}" \
  '.family = $TASK_FAMILY
    | .executionRoleArn = $ECS_EXECUTION_ROLE_ARN
    | .taskRoleArn = $ECS_TASK_ROLE_ARN
    | .containerDefinitions[0].name = $CONTAINER_NAME
    | .containerDefinitions[0].image = $IMAGE
    | .containerDefinitions[0].secrets = [{ "name": "DATABASE_URL", "valueFrom": $DATABASE_SECRET_ARN }]
    | .containerDefinitions[0].logConfiguration.options."awslogs-group" = $LOG_GROUP
    | .containerDefinitions[0].logConfiguration.options."awslogs-region" = $AWS_REGION' \
  servers/transaction-builder-api/task-definition.json > "${tmp_task_def}"

echo "Registering task definition"
task_definition_arn="$(aws ecs register-task-definition \
  --cli-input-json "file://${tmp_task_def}" \
  --region "${AWS_REGION}" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)"

rm -f "${tmp_task_def}"

echo "Updating ECS service"
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --task-definition "${task_definition_arn}" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  --query 'service.deployments[0].[status,taskDefinition]' \
  --output table

echo "Deployment started"
echo "Image: ${new_image}"
echo "Task definition: ${task_definition_arn}"

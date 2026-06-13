# Transaction Builder API Deployment

The backend for the transaction builder only has to persist immutable Published
Actions and serve them back to share pages.

## Production Pieces

1. Postgres database for `published_actions`.
2. `transaction-builder-api` Bun service with `DATABASE_URL`.
3. Public HTTPS URL for the API.
4. Transaction builder UI built with `VITE_API_BASE_URL` pointing at that public
   API URL.

Production currently uses:

```sh
API_HOST=builder-api.commissionroad.xyz
VITE_API_BASE_URL=https://builder-api.commissionroad.xyz
VITE_COMMISSIONROAD_API_BASE_URL=https://api.commissionroad.xyz
```

`builder-api.commissionroad.xyz` should be a DNS CNAME to the shared
CommissionRoad load balancer:

```sh
commissionroad-alb-1177405763.us-east-1.elb.amazonaws.com
```

## Environment

Required:

```sh
DATABASE_URL=postgresql://...
PORT=3000
```

Optional:

```sh
DATABASE_SSL=true
```

`DATABASE_SSL=true` is only needed when the connection string does not already
contain `sslmode=require` and the host is not an AWS RDS hostname.

## Database Migration

Run this once before the first API deploy, and again whenever new SQL migrations
are added:

```sh
DATABASE_URL="postgresql://..." bun run db:migrate
```

The migration runner applies SQL files from
`packages/transaction-builder-database/drizzle` and records applied files in
`transaction_builder_migrations`, so it is safe to rerun.

The ECS Docker image also bundles `/app/migrate.js` and `/app/drizzle` so
production migrations can be run from a one-off ECS task in the same VPC as RDS.

## AWS ECS Path

This repo includes the same deploy shape used by the main CommissionRoad API:
build a Bun bundle, package it into a small Docker image, push to ECR, register a
task definition, and update an ECS Fargate service.

Infra that must exist first:

- ECR repository: `transaction-builder-api`
- CloudWatch log group: `/ecs/transaction-builder-api`
- ECS cluster: `commissionroad`
- ECS service: `transaction-builder-api`
- Task execution role with access to the database secret
- Secrets Manager secret containing the production `DATABASE_URL`
- Load balancer target group routing to container port `3000`

Deploy:

```sh
AWS_ACCOUNT_ID="117687870735" \
ECS_EXECUTION_ROLE_ARN="arn:aws:iam::117687870735:role/..." \
DATABASE_SECRET_ARN="arn:aws:secretsmanager:us-east-1:117687870735:secret:..." \
servers/transaction-builder-api/scripts/deploy.sh
```

Override these if the infra names differ:

```sh
AWS_REGION=us-east-1
ECR_REPOSITORY=transaction-builder-api
ECS_CLUSTER=commissionroad
ECS_SERVICE=transaction-builder-api
CONTAINER_NAME=transaction-builder-api
ECS_TASK_ROLE_ARN=<defaults to ECS_EXECUTION_ROLE_ARN>
TASK_FAMILY=transaction-builder-api
LOG_GROUP=/ecs/transaction-builder-api
```

## Smoke Test

After deploy:

```sh
curl https://builder-api.commissionroad.xyz/health
curl https://builder-api.commissionroad.xyz/ready
```

`/health` checks that the process is alive. `/ready` checks that the API can
reach Postgres.

Then verify publishing and loading an Action from the builder UI. The UI must be
built with:

```sh
VITE_API_BASE_URL=https://<api-host>
```

## Current API Surface

- `POST /actions` stores an immutable Published Action and returns its slug.
- `GET /actions/:slug` returns the Published Action for `/t/:slug` share pages.
- `GET /health` is a process health check.
- `GET /ready` is a database readiness check.

import type {
  ActionDefinitionV1,
  ActionStep,
  Address,
  ContractParameterBinding,
} from "./schema";

export type ActionShape = "commissionCall" | "commissionPlan";

export interface EthValueSource {
  stepId: string;
  binding: ContractParameterBinding;
}

export function getActionShape(definition: ActionDefinitionV1): ActionShape {
  return definition.steps.some(
    (step) => step.kind === "read" || stepUsesStepOutput(step),
  )
    ? "commissionPlan"
    : "commissionCall";
}

export function getActionTargets(definition: ActionDefinitionV1): Address[] {
  return [...new Set(definition.steps.map((step) => step.target))];
}

export function getCallValueBindings(
  definition: ActionDefinitionV1,
): EthValueSource[] {
  return definition.steps
    .filter((step): step is ActionStep & { callValue: ContractParameterBinding } =>
      step.callValue !== undefined,
    )
    .map((step) => ({
      stepId: step.id,
      binding: step.callValue,
    }));
}

function stepUsesStepOutput(step: ActionStep): boolean {
  return [...step.parameters, step.callValue].some(
    (binding) => binding?.kind === "stepOutput",
  );
}

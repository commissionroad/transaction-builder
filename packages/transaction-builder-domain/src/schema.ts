import { z } from "zod";

export const SUPPORTED_ACTION_CHAIN_IDS = [1, 8453, 11155111] as const;

export type SupportedActionChainId = (typeof SUPPORTED_ACTION_CHAIN_IDS)[number];
export type Address = `0x${string}`;

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected an EVM address") as z.ZodType<Address>;

const identifierSchema = z
  .string()
  .regex(
    /^[A-Za-z_][A-Za-z0-9_]*$/,
    "Expected a JavaScript-safe identifier",
  );

const abiParameterSchema = z.object({
  name: z.string().optional(),
  type: z.string().min(1),
});

const contractLabelSchema = z.object({
  verified: z.string().min(1).optional(),
  creator: z.string().min(1).optional(),
});

const abiSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("explorer"),
    explorer: z.string().min(1),
  }),
  z.object({
    kind: z.literal("explorerProxy"),
    explorer: z.string().min(1),
    implementationAddress: addressSchema,
  }),
  z.object({
    kind: z.literal("manual"),
  }),
]);

export const contractSnapshotSchema = z.object({
  id: z.string().min(1),
  chainId: z.union([z.literal(1), z.literal(8453), z.literal(11155111)]),
  address: addressSchema,
  labels: contractLabelSchema.default({}),
  abi: z.array(z.unknown()).min(1),
  abiSource: abiSourceSchema,
});

export const actionVariableSchema = z.object({
  name: identifierSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  unit: z
    .object({
      kind: z.enum(["eth", "erc20", "integer", "unknown"]),
      symbol: z.string().optional(),
      decimals: z.number().int().nonnegative().optional(),
      tokenAddress: addressSchema.optional(),
    })
    .optional(),
});

export const contractParameterBindingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fixed"),
    value: z.unknown(),
  }),
  z.object({
    kind: z.literal("actionVariable"),
    name: identifierSchema,
  }),
  z.object({
    kind: z.literal("stepOutput"),
    stepId: z.string().min(1),
    outputIndex: z.number().int().nonnegative(),
  }),
]);

export const actionStepSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "write",
    "read",
    "sweepErc20",
    "sweepErc1155",
    "permit2Funding",
  ]),
  contractId: z.string().min(1),
  target: addressSchema,
  label: z.string().min(1).optional(),
  functionName: z.string().min(1),
  functionSignature: z.string().min(1),
  stateMutability: z.enum(["payable", "nonpayable", "view", "pure"]),
  inputs: z.array(abiParameterSchema),
  outputs: z.array(abiParameterSchema).default([]),
  parameters: z.array(contractParameterBindingSchema),
  callValue: contractParameterBindingSchema.optional(),
});

const ethCommissionTokenSchema = z.object({
  kind: z.literal("eth"),
});

const erc20CommissionTokenSchema = z.object({
  kind: z.literal("erc20"),
  address: addressSchema,
  symbol: z.string().min(1).optional(),
  decimals: z.number().int().nonnegative().optional(),
});

export const commissionTokenSchema = z.discriminatedUnion("kind", [
  ethCommissionTokenSchema,
  erc20CommissionTokenSchema,
]);

export const commissionFormulaSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("flat"),
    amount: z.string().min(1),
  }),
  z.object({
    kind: z.literal("percentage"),
    bps: z.number().positive(),
    variable: identifierSchema,
  }),
]);

export const actionDefinitionV1Schema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().min(1),
  description: z.string().optional(),
  chainId: z.union([z.literal(1), z.literal(8453), z.literal(11155111)]),
  commissionRoadNftId: z.string().optional(),
  contracts: z.array(contractSnapshotSchema),
  variables: z.array(actionVariableSchema),
  steps: z.array(actionStepSchema),
  commissionToken: commissionTokenSchema,
  commissionFormula: commissionFormulaSchema,
});

export type AbiParameter = z.infer<typeof abiParameterSchema>;
export type ContractSnapshot = z.infer<typeof contractSnapshotSchema>;
export type ActionVariable = z.infer<typeof actionVariableSchema>;
export type ContractParameterBinding = z.infer<
  typeof contractParameterBindingSchema
>;
export type ActionStep = z.infer<typeof actionStepSchema>;
export type CommissionToken = z.infer<typeof commissionTokenSchema>;
export type CommissionFormula = z.infer<typeof commissionFormulaSchema>;
export type ActionDefinitionV1 = z.infer<typeof actionDefinitionV1Schema>;

export interface ValidationIssue {
  path: string;
  message: string;
}

export type DraftValidationResult =
  | {
      success: true;
      definition: ActionDefinitionV1;
      issues: [];
    }
  | {
      success: false;
      issues: ValidationIssue[];
    };

export function validateDraft(input: unknown): DraftValidationResult {
  const parsed = actionDefinitionV1Schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const issues = getSemanticIssues(parsed.data);
  if (issues.length) {
    return { success: false, issues };
  }

  return { success: true, definition: parsed.data, issues: [] };
}

function getSemanticIssues(definition: ActionDefinitionV1): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const variableNames = new Set<string>();
  const duplicateVariableNames = new Set<string>();
  const contractIds = new Set(definition.contracts.map((contract) => contract.id));
  const stepIndexes = new Map<string, number>();
  const usedStepOutputs = new Set<string>();

  definition.variables.forEach((variable, index) => {
    if (variableNames.has(variable.name)) {
      duplicateVariableNames.add(variable.name);
      issues.push({
        path: `variables.${index}.name`,
        message: `Duplicate Action Variable "${variable.name}"`,
      });
      return;
    }
    variableNames.add(variable.name);
  });

  definition.steps.forEach((step, index) => {
    if (stepIndexes.has(step.id)) {
      issues.push({
        path: `steps.${index}.id`,
        message: `Duplicate Action Step "${step.id}"`,
      });
      return;
    }
    stepIndexes.set(step.id, index);
  });

  definition.steps.forEach((step, stepIndex) => {
    if (!contractIds.has(step.contractId)) {
      issues.push({
        path: `steps.${stepIndex}.contractId`,
        message: `Unknown contract "${step.contractId}"`,
      });
    }

    if (step.parameters.length !== step.inputs.length) {
      issues.push({
        path: `steps.${stepIndex}.parameters`,
        message: `Expected ${step.inputs.length} Contract Parameter bindings, received ${step.parameters.length}`,
      });
    }

    const bindings = [...step.parameters, step.callValue].filter(
      (binding): binding is ContractParameterBinding => binding !== undefined,
    );

    bindings.forEach((binding, bindingIndex) => {
      if (binding.kind === "actionVariable" && !variableNames.has(binding.name)) {
        issues.push({
          path: `steps.${stepIndex}.bindings.${bindingIndex}`,
          message: `Unknown Action Variable "${binding.name}"`,
        });
      }

      if (binding.kind !== "stepOutput") {
        return;
      }

      const referencedStepIndex = stepIndexes.get(binding.stepId);
      if (referencedStepIndex === undefined) {
        issues.push({
          path: `steps.${stepIndex}.bindings.${bindingIndex}`,
          message: `Unknown Step Output source "${binding.stepId}"`,
        });
        return;
      }

      if (referencedStepIndex >= stepIndex) {
        issues.push({
          path: `steps.${stepIndex}.bindings.${bindingIndex}`,
          message: "Step Outputs can only reference earlier Action Steps",
        });
      }

      const referencedStep = definition.steps[referencedStepIndex];
      if (binding.outputIndex >= referencedStep.outputs.length) {
        issues.push({
          path: `steps.${stepIndex}.bindings.${bindingIndex}`,
          message: `Step Output index ${binding.outputIndex} does not exist on "${binding.stepId}"`,
        });
      }

      usedStepOutputs.add(binding.stepId);
    });
  });

  definition.steps.forEach((step, stepIndex) => {
    if (step.kind !== "read") {
      return;
    }

    if (!step.outputs.length) {
      issues.push({
        path: `steps.${stepIndex}.outputs`,
        message: "Read Steps must produce a Step Output",
      });
      return;
    }

    if (!usedStepOutputs.has(step.id)) {
      issues.push({
        path: `steps.${stepIndex}`,
        message: "Read Step output must be used by a later Action Step",
      });
    }
  });

  if (
    definition.commissionFormula.kind === "percentage" &&
    !variableNames.has(definition.commissionFormula.variable) &&
    !duplicateVariableNames.has(definition.commissionFormula.variable)
  ) {
    issues.push({
      path: "commissionFormula.variable",
      message: `Unknown Action Variable "${definition.commissionFormula.variable}"`,
    });
  }

  return issues;
}

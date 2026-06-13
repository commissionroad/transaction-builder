import type {
  AbiParameter,
  ActionDefinitionV1,
  ActionStep,
  ActionVariable,
  Address,
  ContractParameterBinding,
  ContractSnapshot,
} from "@transaction-builder/domain";

export type BuilderDraft = ActionDefinitionV1;

export function createInitialBuilderDraft(): BuilderDraft {
  return {
    schemaVersion: 1,
    title: "",
    description: "",
    chainId: 1,
    contracts: [],
    variables: [],
    steps: [],
    commissionToken: { kind: "eth" },
    commissionFormula: { kind: "flat", amount: "0" },
  };
}

export function getDraftStepCount(draft: BuilderDraft): number {
  return draft.steps.length;
}

export function getDefaultFixedValue(type: string): unknown {
  if (type === "address") {
    return "0x0000000000000000000000000000000000000000";
  }

  if (type === "bool") {
    return false;
  }

  if (type.startsWith("uint") || type.startsWith("int")) {
    return "0";
  }

  if (type.startsWith("bytes")) {
    return "0x";
  }

  return "";
}

export function createContractId(
  existingContracts: ContractSnapshot[],
): string {
  return `contract${existingContracts.length + 1}`;
}

export function createStepFromFunction({
  contract,
  functionFragment,
  stepIndex,
}: {
  contract: ContractSnapshot;
  functionFragment: AbiFunctionFragment;
  stepIndex: number;
}): ActionStep {
  return {
    id: `step${stepIndex + 1}`,
    kind:
      functionFragment.stateMutability === "view" ||
      functionFragment.stateMutability === "pure"
        ? "read"
        : "write",
    contractId: contract.id,
    target: contract.address,
    functionName: functionFragment.name,
    functionSignature: getFunctionSignature(functionFragment),
    stateMutability: functionFragment.stateMutability,
    inputs: functionFragment.inputs.map(toAbiParameter),
    outputs: functionFragment.outputs.map(toAbiParameter),
    parameters: functionFragment.inputs.map((input) => ({
      kind: "fixed",
      value: getDefaultFixedValue(input.type),
    })),
    callValue:
      functionFragment.stateMutability === "payable"
        ? { kind: "fixed", value: "0" }
        : undefined,
  };
}

export function createActionVariable({
  existingVariables,
  preferredName,
  type,
  label,
  unit,
}: {
  existingVariables: ActionVariable[];
  preferredName: string;
  type: string;
  label: string;
  unit?: ActionVariable["unit"];
}): ActionVariable {
  const baseName = toIdentifier(preferredName || "actionVariable");
  const existingNames = new Set(
    existingVariables.map((variable) => variable.name),
  );
  let name = baseName;
  let index = 2;

  while (existingNames.has(name)) {
    name = `${baseName}${index}`;
    index += 1;
  }

  return {
    name,
    label,
    type,
    unit,
  };
}

export function updateParameterBinding({
  step,
  parameterIndex,
  binding,
}: {
  step: ActionStep;
  parameterIndex: number;
  binding: ContractParameterBinding;
}): ActionStep {
  return {
    ...step,
    parameters: step.parameters.map((parameter, index) =>
      index === parameterIndex ? binding : parameter,
    ),
  };
}

export interface AbiFunctionFragment {
  type: "function";
  name: string;
  stateMutability: "payable" | "nonpayable" | "view" | "pure";
  inputs: Array<AbiParameter & { internalType?: string }>;
  outputs: Array<AbiParameter & { internalType?: string }>;
}

export function getAbiFunctions(abi: unknown[]): AbiFunctionFragment[] {
  return abi.filter(isAbiFunctionFragment).sort((a, b) => {
    const mutabilityOrder = getMutabilityOrder(a) - getMutabilityOrder(b);
    return mutabilityOrder || a.name.localeCompare(b.name);
  });
}

export function isWriteFunction(fragment: AbiFunctionFragment): boolean {
  return (
    fragment.stateMutability === "payable" ||
    fragment.stateMutability === "nonpayable"
  );
}

export function getFunctionSignature(fragment: AbiFunctionFragment): string {
  return `${fragment.name}(${fragment.inputs.map((input) => input.type).join(",")})`;
}

function toIdentifier(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_]/g, "_");
  const withPrefix = /^[A-Za-z_]/.test(normalized)
    ? normalized
    : `variable_${normalized}`;
  return withPrefix || "actionVariable";
}

function toAbiParameter(parameter: AbiParameter): AbiParameter {
  return {
    name: parameter.name,
    type: parameter.type,
  };
}

function isAbiFunctionFragment(value: unknown): value is AbiFunctionFragment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const fragment = value as Partial<AbiFunctionFragment>;
  return (
    fragment.type === "function" &&
    typeof fragment.name === "string" &&
    typeof fragment.stateMutability === "string" &&
    Array.isArray(fragment.inputs) &&
    Array.isArray(fragment.outputs)
  );
}

function getMutabilityOrder(fragment: AbiFunctionFragment): number {
  if (fragment.stateMutability === "payable") return 0;
  if (fragment.stateMutability === "nonpayable") return 1;
  return 2;
}

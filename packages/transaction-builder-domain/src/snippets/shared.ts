import {
  ETH_SENTINEL,
  commissionRoadAbi,
  erc20Abi,
  getCommissionRoadAddresses,
  permit2Abi,
} from "@transaction-builder/commissionroad-protocol";
import { getActionShape } from "../compile";
import type {
  ActionDefinitionV1,
  ActionStep,
  ActionVariable,
  ContractParameterBinding,
} from "../schema";

export interface SnippetOptions {
  functionName?: string;
}

export function assertSnippetSupported(definition: ActionDefinitionV1): void {
  if (getActionShape(definition) !== "commissionCall") {
    throw new Error(
      "Snippet generation currently supports independent Actions only",
    );
  }
}

export function generateActionFunctionName(
  definition: ActionDefinitionV1,
  options: SnippetOptions = {},
): string {
  if (options.functionName) {
    return options.functionName;
  }

  const words = definition.title
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const pascalName = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return `execute${pascalName || "CommissionRoadAction"}`;
}

export function createSnippetContext(definition: ActionDefinitionV1) {
  const addresses = getCommissionRoadAddresses(definition.chainId);
  const variables = definition.variables;
  const functionName = generateActionFunctionName(definition);
  const actionShape = getActionShape(definition);
  const contractAbiVariableNames = getContractAbiVariableNames(definition);
  const getContractAbiVariableName = (contractId: string) =>
    contractAbiVariableNames.get(contractId) ??
    `${toSafePropertyName(contractId)}Abi`;

  return {
    actionShape,
    addresses,
    definition,
    functionName,
    variableArgs: variables.map((variable) => variable.name).join(", "),
    variables,
    variableTypeLines: variables
      .map((variable) => `  ${variable.name}: ${getTypeScriptType(variable)};`)
      .join("\n"),
    contractAbiLines: definition.contracts
      .filter((contract) => contractAbiVariableNames.has(contract.id))
      .map((contract) => {
        const abi = getContractStepAbi(
          contract.abi,
          definition.steps.filter((step) => step.contractId === contract.id),
        );
        return `const ${getContractAbiVariableName(contract.id)} = ${JSON.stringify(abi, null, 2)} as const;`;
      })
      .join("\n\n"),
    batchCallLines: definition.steps
      .map((step) => formatBatchCall(step, getContractAbiVariableName))
      .join(",\n"),
    chainId: definition.chainId,
    commissionExpression: formatCommissionExpression(definition),
    commissionRoadAddress: addresses.commissionRoad,
    commissionTokenDecimals: getCommissionTokenDecimals(definition),
    commissionToken:
      definition.commissionToken.kind === "eth"
        ? ETH_SENTINEL
        : definition.commissionToken.address,
    commissionRoadAbiLiteral: JSON.stringify(
      getNamedAbiFunctions(commissionRoadAbi, [
        actionShape === "commissionPlan" ? "commissionPlan" : "commissionCall",
      ]),
      null,
      2,
    ),
    erc20AbiLiteral: JSON.stringify(
      getNamedAbiFunctions(erc20Abi, ["allowance", "approve"]),
      null,
      2,
    ),
    nftId: definition.commissionRoadNftId ?? "0",
    permit2AbiLiteral: JSON.stringify(getPermit2TransferFromAbi(), null, 2),
    permit2Address: addresses.permit2,
    permit2TypedDataTypesLiteral: JSON.stringify(
      {
        PermitTransferFrom: [
          { name: "permitted", type: "TokenPermissions" },
          { name: "spender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
        TokenPermissions: [
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
        ],
      },
      null,
      2,
    ),
    totalValueExpression: formatTotalValueExpression(definition),
    usesFlatCommission: definition.commissionFormula.kind === "flat",
    usesPermit2Funding: definition.commissionToken.kind === "erc20",
    planStepLines: formatPlanStepLines(definition, getContractAbiVariableName),
  };
}

type ContractAbiVariableNameResolver = (contractId: string) => string;

function formatBatchCall(
  step: ActionStep,
  getContractAbiVariableName: ContractAbiVariableNameResolver,
): string {
  return `  {
    target: ${JSON.stringify(step.target)},
    callData: encodeFunctionData({
      abi: ${getContractAbiVariableName(step.contractId)},
      functionName: ${JSON.stringify(step.functionName)},
      args: [${step.parameters
        .map((binding, index) =>
          formatBinding(binding, step.inputs[index]?.type),
        )
        .join(", ")}],
    }),
    value: ${step.callValue ? formatBinding(step.callValue, "uint256") : "0n"},
  }`;
}

function formatBinding(
  binding: ContractParameterBinding,
  abiType?: string,
): string {
  if (binding.kind === "fixed") {
    return formatFixedValue(binding.value, abiType);
  }

  if (binding.kind === "actionVariable") {
    return binding.name;
  }

  return `/* Step Output ${binding.stepId}[${binding.outputIndex}] is available in commissionPlan snippets */`;
}

export function formatPlanStepLines(
  definition: ActionDefinitionV1,
  getContractAbiVariableName: ContractAbiVariableNameResolver = (contractId) =>
    `${toSafePropertyName(contractId)}Abi`,
): string {
  return definition.steps
    .map((step, index) =>
      formatPlanStep(step, index, getContractAbiVariableName),
    )
    .join("\n\n");
}

function formatPlanStep(
  step: ActionStep,
  index: number,
  getContractAbiVariableName: ContractAbiVariableNameResolver,
): string {
  const stepName = `step${index + 1}_${toSafePropertyName(step.id)}`;
  const contractName = `${stepName}Contract`;
  const callName = `${stepName}Call`;
  const outputName = getStepOutputVariableName(step.id, 0);
  const flag =
    step.stateMutability === "view" || step.stateMutability === "pure"
      ? "WeirollCommandFlags.STATICCALL"
      : "WeirollCommandFlags.CALL";
  const args = step.parameters
    .map((binding, parameterIndex) =>
      formatPlanBinding(binding, step.inputs[parameterIndex]?.type),
    )
    .join(", ");
  const callValue = step.callValue
    ? `.withValue(${formatPlanBinding(step.callValue, "uint256")} as any)`
    : "";
  const addLine =
    step.outputs.length === 1
      ? `  const ${outputName} = planner.add(${callName});
  if (!${outputName}) {
    throw new Error(${JSON.stringify(`${step.functionSignature} did not produce a Step Output.`)});
  }`
      : `  planner.add(${callName});`;

  return `  const ${contractName} = createWeirollContract(
    adapter.getContract(${JSON.stringify(step.target)} as Address, ${getContractAbiVariableName(step.contractId)}),
    ${flag},
  );
  const ${callName} = ${contractName}.functions[${JSON.stringify(step.functionSignature)}](${args})${callValue};
${addLine}`;
}

function formatPlanBinding(
  binding: ContractParameterBinding,
  abiType?: string,
): string {
  if (binding.kind === "stepOutput") {
    return getStepOutputVariableName(binding.stepId, binding.outputIndex);
  }

  return formatBinding(binding, abiType);
}

function getStepOutputVariableName(
  stepId: string,
  outputIndex: number,
): string {
  return `stepOutput_${toSafePropertyName(stepId)}_${outputIndex}`;
}

function formatFixedValue(value: unknown, abiType?: string): string {
  if (typeof value === "bigint") {
    return `${value.toString()}n`;
  }

  if (isIntegerType(abiType)) {
    return `${String(value || "0")}n`;
  }

  if (abiType === "bool") {
    return value === true || value === "true" ? "true" : "false";
  }

  return JSON.stringify(value);
}

function formatCommissionExpression(definition: ActionDefinitionV1): string {
  if (definition.commissionFormula.kind === "flat") {
    return `parseUnits(${JSON.stringify(definition.commissionFormula.amount)}, ${getCommissionTokenDecimals(definition)})`;
  }

  return `(${definition.commissionFormula.variable} * ${BigInt(
    definition.commissionFormula.bps,
  )}n) / 10_000n`;
}

function getCommissionTokenDecimals(definition: ActionDefinitionV1): number {
  if (definition.commissionToken.kind === "eth") {
    return 18;
  }

  return definition.commissionToken.decimals ?? 18;
}

function formatTotalValueExpression(definition: ActionDefinitionV1): string {
  const valueParts = definition.steps
    .map((step) => step.callValue)
    .filter((binding): binding is ContractParameterBinding => !!binding)
    .map((binding) => formatBinding(binding, "uint256"));

  if (definition.commissionToken.kind === "eth") {
    valueParts.push("commission");
  }

  return valueParts.length ? valueParts.join(" + ") : "0n";
}

function isIntegerType(abiType: string | undefined): boolean {
  return !!abiType && (abiType.startsWith("uint") || abiType.startsWith("int"));
}

type AbiFunctionLike = {
  type?: unknown;
  name?: unknown;
  inputs?: readonly AbiParameterLike[];
  outputs?: readonly AbiParameterLike[];
  stateMutability?: unknown;
};

type AbiParameterLike = {
  name?: unknown;
  type?: unknown;
  internalType?: unknown;
  components?: unknown;
};

function getContractAbiVariableNames(
  definition: ActionDefinitionV1,
): Map<string, string> {
  const usedContractIds = new Set(
    definition.steps.map((step) => step.contractId),
  );
  const reservedNames = new Set([
    "commissionRoadAbi",
    "erc20Abi",
    "permit2Abi",
    "permit2TypedDataTypes",
  ]);
  const usedNames = new Set(reservedNames);
  const names = new Map<string, string>();

  definition.contracts
    .filter((contract) => usedContractIds.has(contract.id))
    .forEach((contract) => {
      const safeName = toSafePropertyName(contract.id);
      const baseName = `${safeName}Abi`;
      const fallbackBaseName = `${safeName}ContractAbi`;
      let candidate = reservedNames.has(baseName) ? fallbackBaseName : baseName;
      let suffix = 2;

      while (usedNames.has(candidate)) {
        candidate = `${fallbackBaseName}${suffix}`;
        suffix += 1;
      }

      usedNames.add(candidate);
      names.set(contract.id, candidate);
    });

  return names;
}

function getContractStepAbi(
  contractAbi: readonly unknown[],
  steps: readonly ActionStep[],
): unknown[] {
  const fragments: unknown[] = [];
  const seenSignatures = new Set<string>();

  steps.forEach((step) => {
    if (seenSignatures.has(step.functionSignature)) {
      return;
    }

    seenSignatures.add(step.functionSignature);
    fragments.push(
      findStepAbiFragment(contractAbi, step) ?? createStepAbiFragment(step),
    );
  });

  return fragments;
}

function findStepAbiFragment(
  contractAbi: readonly unknown[],
  step: ActionStep,
): AbiFunctionLike | undefined {
  const candidates = contractAbi
    .filter(isAbiFunctionLike)
    .filter((fragment) => fragment.name === step.functionName);
  const exactMatch = candidates.find(
    (fragment) => getFunctionSignature(fragment) === step.functionSignature,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const inputTypeMatch = candidates.find(
    (fragment) =>
      getInputTypes(fragment).join(",") ===
      step.inputs.map((input) => input.type).join(","),
  );

  if (inputTypeMatch) {
    return inputTypeMatch;
  }

  return candidates.length === 1 ? candidates[0] : undefined;
}

function createStepAbiFragment(step: ActionStep): AbiFunctionLike {
  return {
    type: "function",
    name: step.functionName,
    inputs: step.inputs.map((input) => ({
      name: input.name ?? "",
      type: input.type,
    })),
    outputs: step.outputs.map((output) => ({
      name: output.name ?? "",
      type: output.type,
    })),
    stateMutability: step.stateMutability,
  };
}

function getNamedAbiFunctions(
  abi: readonly unknown[],
  names: readonly string[],
): unknown[] {
  const nameSet = new Set(names);
  const fragments = abi
    .filter(isAbiFunctionLike)
    .filter((fragment) => nameSet.has(String(fragment.name)));
  const foundNames = new Set(
    fragments.map((fragment) => String(fragment.name)),
  );
  const missingNames = names.filter((name) => !foundNames.has(name));

  if (missingNames.length) {
    throw new Error(
      `Required ABI functions are missing: ${missingNames.join(", ")}`,
    );
  }

  return fragments;
}

function getPermit2TransferFromAbi(): unknown[] {
  const fragment = permit2Abi
    .filter(isAbiFunctionLike)
    .find(
      (candidate) =>
        candidate.name === "permitTransferFrom" &&
        candidate.inputs?.length === 4,
    );

  if (!fragment) {
    throw new Error("Permit2 permitTransferFrom ABI function is missing.");
  }

  return [fragment];
}

function isAbiFunctionLike(value: unknown): value is AbiFunctionLike {
  return (
    !!value &&
    typeof value === "object" &&
    (value as AbiFunctionLike).type === "function" &&
    typeof (value as AbiFunctionLike).name === "string"
  );
}

function getFunctionSignature(fragment: AbiFunctionLike): string {
  return `${String(fragment.name)}(${getInputTypes(fragment).join(",")})`;
}

function getInputTypes(fragment: AbiFunctionLike): string[] {
  return (fragment.inputs ?? [])
    .map((input) => input.type)
    .filter((type): type is string => typeof type === "string");
}

function getTypeScriptType(variable: ActionVariable): string {
  if (variable.type === "address") {
    return "Address";
  }

  if (variable.type.startsWith("uint") || variable.type.startsWith("int")) {
    return "bigint";
  }

  if (variable.type === "bool") {
    return "boolean";
  }

  if (variable.type.startsWith("bytes")) {
    return "Hex";
  }

  return "string";
}

function toSafePropertyName(value: string): string {
  const safeName = value.replace(/[^A-Za-z0-9_$]/g, "_");
  return /^[A-Za-z_$]/.test(safeName) ? safeName : `contract_${safeName}`;
}

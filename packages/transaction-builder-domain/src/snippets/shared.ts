import {
  ETH_SENTINEL,
  commissionRoadAbi,
  getCommissionRoadAddresses,
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
  assertSnippetSupported(definition);

  const addresses = getCommissionRoadAddresses(definition.chainId);
  const variables = definition.variables;
  const functionName = generateActionFunctionName(definition);

  return {
    addresses,
    functionName,
    variableArgs: variables.map((variable) => variable.name).join(", "),
    variables,
    variableTypeLines: variables
      .map((variable) => `  ${variable.name}: ${getTypeScriptType(variable)};`)
      .join("\n"),
    contractAbiLines: definition.contracts
      .map((contract) => {
        const key = toSafePropertyName(contract.id);
        return `const ${key}Abi = ${JSON.stringify(contract.abi, null, 2)} as const;`;
      })
      .join("\n\n"),
    batchCallLines: definition.steps
      .map((step) => formatBatchCall(step))
      .join(",\n"),
    commissionExpression: formatCommissionExpression(definition),
    commissionToken:
      definition.commissionToken.kind === "eth"
        ? ETH_SENTINEL
        : definition.commissionToken.address,
    commissionRoadAbiLiteral: JSON.stringify(commissionRoadAbi, null, 2),
    nftId: definition.commissionRoadNftId ?? "0",
    totalValueExpression: formatTotalValueExpression(definition),
  };
}

function formatBatchCall(step: ActionStep): string {
  return `  {
    target: ${JSON.stringify(step.target)},
    callData: encodeFunctionData({
      abi: ${toSafePropertyName(step.contractId)}Abi,
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
    return `${definition.commissionFormula.amount}n`;
  }

  return `(${definition.commissionFormula.variable} * ${BigInt(
    definition.commissionFormula.bps,
  )}n) / 10_000n`;
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

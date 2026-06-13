import {
  ETH_SENTINEL,
  commissionRoadAbi,
  permit2Abi,
  getCommissionRoadAddresses,
} from "@transaction-builder/commissionroad-protocol";
import {
  createPermit2FundingCallArgs,
  createPermit2FundingRequest,
  getActionShape,
  validateDraft,
  type ActionDefinitionV1,
  type ActionStep,
  type ActionVariable,
  type ContractParameterBinding,
  type ValidationIssue,
} from "@transaction-builder/domain";
import {
  encodeFunctionData,
  isAddress,
  parseUnits,
  type Abi,
  type Address,
  type Hex,
} from "viem";

export type RawActionVariableValues = Record<string, string | boolean>;

export interface Permit2Authorization {
  owner: Address;
  signature: Hex;
  nonce: bigint;
  deadline: bigint;
}

export interface CommissionCallBatchItem {
  target: Address;
  callData: Hex;
  value: bigint;
}

export interface PreparedCommissionCall {
  address: Address;
  abi: typeof commissionRoadAbi;
  functionName: "commissionCall";
  args: readonly [CommissionCallBatchItem[], bigint, Address, bigint];
  value: bigint;
  chainId: ActionDefinitionV1["chainId"];
  commission: bigint;
  commissionToken: Address;
  batchCallData: CommissionCallBatchItem[];
  permit2Funding?: {
    amount: bigint;
    target: Address;
  };
}

export type PrepareCommissionCallResult =
  | {
      success: true;
      prepared: PreparedCommissionCall;
    }
  | {
      success: false;
      issues: ValidationIssue[];
    };

export type PreviewCommissionCallResult =
  | {
      success: true;
      preview: {
        batchCallData: CommissionCallBatchItem[];
        chainId: ActionDefinitionV1["chainId"];
        commission: bigint;
        commissionToken: Address;
        commissionTokenDecimals: number;
        requiresPermit2Funding: boolean;
        totalEthValue: bigint;
      };
    }
  | {
      success: false;
      issues: ValidationIssue[];
    };

export function previewCommissionCall({
  definition,
  rawValues,
}: {
  definition: ActionDefinitionV1;
  rawValues: RawActionVariableValues;
}): PreviewCommissionCallResult {
  const validation = validateDraft(definition);
  if (!validation.success) {
    return validation;
  }

  if (getActionShape(definition) !== "commissionCall") {
    return fail("steps", "Commission Plans are not executable in this MVP.");
  }

  if (!definition.commissionRoadNftId) {
    return fail(
      "commissionRoadNftId",
      "This Action does not include a CommissionRoad NFT ID.",
    );
  }

  const parsedVariables = parseActionVariables({
    variables: definition.variables,
    rawValues,
  });
  if (!parsedVariables.success) {
    return parsedVariables;
  }

  const batchResult = createBatchCallData({
    definition,
    parsedVariables: parsedVariables.values,
  });
  if (!batchResult.success) {
    return batchResult;
  }

  const commissionResult = getCommissionAmount({
    definition,
    parsedVariables: parsedVariables.values,
  });
  if (!commissionResult.success) {
    return commissionResult;
  }

  const commissionToken =
    definition.commissionToken.kind === "eth"
      ? ETH_SENTINEL
      : definition.commissionToken.address;
  const totalValue =
    batchResult.batchCallData.reduce((sum, item) => sum + item.value, 0n) +
    (definition.commissionToken.kind === "eth"
      ? commissionResult.commission
      : 0n);

  return {
    success: true,
    preview: {
      batchCallData: batchResult.batchCallData,
      chainId: definition.chainId,
      commission: commissionResult.commission,
      commissionToken,
      commissionTokenDecimals: getCommissionTokenDecimals(definition),
      requiresPermit2Funding: definition.commissionToken.kind === "erc20",
      totalEthValue: totalValue,
    },
  };
}

export function prepareCommissionCall({
  definition,
  permit2Authorization,
  rawValues,
}: {
  definition: ActionDefinitionV1;
  permit2Authorization?: Permit2Authorization;
  rawValues: RawActionVariableValues;
}): PrepareCommissionCallResult {
  const preview = previewCommissionCall({ definition, rawValues });
  if (!preview.success) {
    return preview;
  }

  const nftId = definition.commissionRoadNftId;
  if (!nftId) {
    return fail(
      "commissionRoadNftId",
      "This Action does not include a CommissionRoad NFT ID.",
    );
  }

  const addresses = getCommissionRoadAddresses(definition.chainId);
  const batchCallData = [...preview.preview.batchCallData];
  let permit2Funding: PreparedCommissionCall["permit2Funding"];

  if (definition.commissionToken.kind === "erc20") {
    if (!permit2Authorization) {
      return fail(
        "permit2",
        "Sign a Permit2 authorization for the exact commission amount before executing.",
      );
    }

    const request = createPermit2FundingRequest({
      commission: preview.preview.commission,
      commissionRoadAddress: addresses.commissionRoad,
      definition,
      deadline: permit2Authorization.deadline,
      nonce: permit2Authorization.nonce,
      owner: permit2Authorization.owner,
      permit2Address: addresses.permit2,
    });

    batchCallData.unshift({
      target: addresses.permit2,
      callData: encodeFunctionData({
        abi: permit2Abi,
        functionName: "permitTransferFrom",
        args: createPermit2FundingCallArgs({
          request,
          signature: permit2Authorization.signature,
        }),
      }),
      value: 0n,
    });

    permit2Funding = {
      amount: preview.preview.commission,
      target: addresses.permit2,
    };
  }

  const address = getCommissionRoadAddresses(definition.chainId).commissionRoad;
  const args = [
    batchCallData,
    BigInt(nftId),
    preview.preview.commissionToken,
    preview.preview.commission,
  ] as const;

  return {
    success: true,
    prepared: {
      address,
      abi: commissionRoadAbi,
      functionName: "commissionCall",
      args,
      value: preview.preview.totalEthValue,
      chainId: preview.preview.chainId,
      commission: preview.preview.commission,
      commissionToken: preview.preview.commissionToken,
      batchCallData,
      permit2Funding,
    },
  };
}

function parseActionVariables({
  variables,
  rawValues,
}: {
  variables: ActionVariable[];
  rawValues: RawActionVariableValues;
}):
  | { success: true; values: Record<string, unknown> }
  | { success: false; issues: ValidationIssue[] } {
  const values: Record<string, unknown> = {};
  const issues: ValidationIssue[] = [];

  for (const variable of variables) {
    const rawValue = rawValues[variable.name];
    if (rawValue === undefined || rawValue === "") {
      issues.push({
        path: `variables.${variable.name}`,
        message: `${variable.label} is required.`,
      });
      continue;
    }

    const parsed = parseActionVariableValue(variable, rawValue);
    if (!parsed.success) {
      issues.push(parsed.issue);
      continue;
    }

    values[variable.name] = parsed.value;
  }

  if (issues.length) {
    return { success: false, issues };
  }

  return { success: true, values };
}

function parseActionVariableValue(
  variable: ActionVariable,
  rawValue: string | boolean,
):
  | { success: true; value: unknown }
  | { success: false; issue: ValidationIssue } {
  try {
    if (variable.type === "address") {
      if (typeof rawValue !== "string" || !isAddress(rawValue)) {
        return {
          success: false,
          issue: {
            path: `variables.${variable.name}`,
            message: `${variable.label} must be a valid EVM address.`,
          },
        };
      }
      return { success: true, value: rawValue };
    }

    if (variable.type === "bool") {
      if (typeof rawValue === "boolean") {
        return { success: true, value: rawValue };
      }
      return { success: true, value: rawValue === "true" };
    }

    if (variable.type.startsWith("uint") || variable.type.startsWith("int")) {
      if (variable.unit?.kind === "eth" || variable.unit?.kind === "erc20") {
        return {
          success: true,
          value: parseUnits(rawValue.toString(), variable.unit.decimals ?? 18),
        };
      }

      return { success: true, value: BigInt(rawValue.toString()) };
    }

    return { success: true, value: rawValue };
  } catch {
    return {
      success: false,
      issue: {
        path: `variables.${variable.name}`,
        message: `${variable.label} could not be parsed as ${variable.type}.`,
      },
    };
  }
}

function createBatchCallData({
  definition,
  parsedVariables,
}: {
  definition: ActionDefinitionV1;
  parsedVariables: Record<string, unknown>;
}):
  | { success: true; batchCallData: CommissionCallBatchItem[] }
  | { success: false; issues: ValidationIssue[] } {
  const batchCallData: CommissionCallBatchItem[] = [];

  for (const step of definition.steps) {
    const contract = definition.contracts.find(
      (candidate) => candidate.id === step.contractId,
    );
    if (!contract) {
      return fail("steps", `Unknown contract "${step.contractId}".`);
    }

    const args: unknown[] = [];
    for (const [index, binding] of step.parameters.entries()) {
      const result = resolveBinding({
        binding,
        abiType: step.inputs[index]?.type,
        parsedVariables,
      });

      if (!result.success) {
        return { success: false, issues: [result.issue] };
      }

      args.push(result.value);
    }

    const valueResult = step.callValue
      ? resolveBinding({
          binding: step.callValue,
          abiType: "uint256",
          parsedVariables,
        })
      : { success: true as const, value: 0n };
    if (!valueResult.success) {
      return { success: false, issues: [valueResult.issue] };
    }

    batchCallData.push({
      target: step.target,
      callData: encodeFunctionData({
        abi: contract.abi as Abi,
        functionName: step.functionName,
        args,
      }),
      value: BigInt(String(valueResult.value)),
    });
  }

  return { success: true, batchCallData };
}

function resolveBinding({
  binding,
  abiType,
  parsedVariables,
}: {
  binding: ContractParameterBinding;
  abiType?: string;
  parsedVariables: Record<string, unknown>;
}):
  | { success: true; value: unknown }
  | { success: false; issue: ValidationIssue } {
  if (binding.kind === "actionVariable") {
    if (!(binding.name in parsedVariables)) {
      return {
        success: false,
        issue: {
          path: `variables.${binding.name}`,
          message: `Missing Action Variable "${binding.name}".`,
        },
      };
    }
    return { success: true, value: parsedVariables[binding.name] };
  }

  if (binding.kind === "stepOutput") {
    return {
      success: false,
      issue: {
        path: "steps",
        message: "Step Outputs require Commission Plan execution.",
      },
    };
  }

  return {
    success: true,
    value: parseFixedValue(binding.value, abiType),
  };
}

function parseFixedValue(value: unknown, abiType?: string): unknown {
  if (abiType?.startsWith("uint") || abiType?.startsWith("int")) {
    return BigInt(String(value || "0"));
  }

  if (abiType === "bool") {
    return value === true || value === "true";
  }

  return value;
}

function getCommissionAmount({
  definition,
  parsedVariables,
}: {
  definition: ActionDefinitionV1;
  parsedVariables: Record<string, unknown>;
}):
  | { success: true; commission: bigint }
  | { success: false; issues: ValidationIssue[] } {
  if (definition.commissionFormula.kind === "flat") {
    try {
      return {
        success: true,
        commission: parseUnits(
          definition.commissionFormula.amount,
          getCommissionTokenDecimals(definition),
        ),
      };
    } catch {
      return fail(
        "commissionFormula.amount",
        `Flat commission amount could not be parsed.`,
      );
    }
  }

  const source = parsedVariables[definition.commissionFormula.variable];
  if (typeof source !== "bigint") {
    return fail(
      "commissionFormula.variable",
      `Commission source "${definition.commissionFormula.variable}" must resolve to a bigint.`,
    );
  }

  return {
    success: true,
    commission: (source * BigInt(definition.commissionFormula.bps)) / 10_000n,
  };
}

function getCommissionTokenDecimals(definition: ActionDefinitionV1): number {
  if (definition.commissionToken.kind === "eth") {
    return 18;
  }

  return definition.commissionToken.decimals ?? 18;
}

function fail(
  path: string,
  message: string,
): { success: false; issues: ValidationIssue[] } {
  return { success: false, issues: [{ path, message }] };
}

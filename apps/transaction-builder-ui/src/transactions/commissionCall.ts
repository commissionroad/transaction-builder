import {
  ETH_SENTINEL,
  commissionRoadAbi,
  permit2Abi,
  getCommissionRoadAddresses,
} from "@transaction-builder/commissionroad-protocol";
import { setGlobalAdapter } from "@cowprotocol/sdk-common";
import {
  WeirollCommandFlags,
  WeirollPlanner,
  createWeirollContract,
} from "@cowprotocol/sdk-weiroll";
import { ViemAdapter } from "@cowprotocol/sdk-viem-adapter";
import {
  createPermit2FundingCallArgs,
  createPermit2FundingRequest,
  type ActionShape,
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
  type PublicClient,
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

export interface PreparedPermit2Funding {
  amount: bigint;
  target: Address;
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
  permit2Funding?: PreparedPermit2Funding;
}

export interface PreparedCommissionPlan {
  address: Address;
  abi: typeof commissionRoadAbi;
  functionName: "commissionPlan";
  args: readonly [readonly Hex[], readonly Hex[], bigint, Address, bigint];
  value: bigint;
  chainId: ActionDefinitionV1["chainId"];
  commission: bigint;
  commissionToken: Address;
  commands: readonly Hex[];
  state: readonly Hex[];
  permit2Funding?: PreparedPermit2Funding;
}

export function getExecutableActionVariables(
  definition: ActionDefinitionV1,
): ActionVariable[] {
  const ethCallValueVariableNames = new Set(
    definition.steps.flatMap((step) =>
      step.callValue?.kind === "actionVariable" ? [step.callValue.name] : [],
    ),
  );

  return definition.variables.map((variable) => {
    if (
      variable.unit ||
      !isIntegerAbiType(variable.type) ||
      !ethCallValueVariableNames.has(variable.name)
    ) {
      return variable;
    }

    return {
      ...variable,
      unit: { kind: "eth", symbol: "ETH", decimals: 18 },
    };
  });
}

export type PreparedActionTransaction =
  | PreparedCommissionCall
  | PreparedCommissionPlan;

export type PrepareCommissionCallResult =
  | {
      success: true;
      prepared: PreparedActionTransaction;
    }
  | {
      success: false;
      issues: ValidationIssue[];
    };

export type PreviewCommissionCallResult =
  | {
      success: true;
      preview: {
        actionShape: ActionShape;
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

  if (!definition.commissionRoadNftId) {
    return fail(
      "commissionRoadNftId",
      "This Action does not include a CommissionRoad NFT ID.",
    );
  }

  const parsedVariables = parseActionVariables({
    variables: getExecutableActionVariables(definition),
    rawValues,
  });
  if (!parsedVariables.success) {
    return parsedVariables;
  }

  const actionShape = getActionShape(definition);
  let batchCallData: CommissionCallBatchItem[] = [];
  let stepEthValue = 0n;

  if (actionShape === "commissionCall") {
    const batchResult = createBatchCallData({
      definition,
      parsedVariables: parsedVariables.values,
    });
    if (!batchResult.success) {
      return batchResult;
    }

    batchCallData = batchResult.batchCallData;
    stepEthValue = batchCallData.reduce((sum, item) => sum + item.value, 0n);
  } else {
    const planValueResult = getKnownStepEthValue({
      definition,
      parsedVariables: parsedVariables.values,
    });
    if (!planValueResult.success) {
      return planValueResult;
    }

    stepEthValue = planValueResult.value;
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
    stepEthValue +
    (definition.commissionToken.kind === "eth"
      ? commissionResult.commission
      : 0n);

  return {
    success: true,
    preview: {
      actionShape,
      batchCallData,
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
  publicClient,
  rawValues,
}: {
  definition: ActionDefinitionV1;
  permit2Authorization?: Permit2Authorization;
  publicClient?: PublicClient;
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

  const parsedVariables = parseActionVariables({
    variables: getExecutableActionVariables(definition),
    rawValues,
  });
  if (!parsedVariables.success) {
    return parsedVariables;
  }

  const addresses = getCommissionRoadAddresses(definition.chainId);
  let permit2Funding: PreparedPermit2Funding | undefined;

  if (definition.commissionToken.kind === "erc20" && !permit2Authorization) {
    return fail(
      "permit2",
      "Sign a Permit2 authorization for the exact commission amount before executing.",
    );
  }

  if (preview.preview.actionShape === "commissionPlan") {
    if (!publicClient) {
      return fail(
        "publicClient",
        "Unable to prepare this Commission Plan without a public client.",
      );
    }

    const planResult = createCommissionPlan({
      addresses,
      commission: preview.preview.commission,
      definition,
      parsedVariables: parsedVariables.values,
      permit2Authorization,
      publicClient,
    });
    if (!planResult.success) {
      return planResult;
    }

    const address = addresses.commissionRoad;
    const args = [
      planResult.commands,
      planResult.state,
      BigInt(nftId),
      preview.preview.commissionToken,
      preview.preview.commission,
    ] as const;

    return {
      success: true,
      prepared: {
        address,
        abi: commissionRoadAbi,
        functionName: "commissionPlan",
        args,
        value: preview.preview.totalEthValue,
        chainId: preview.preview.chainId,
        commission: preview.preview.commission,
        commissionToken: preview.preview.commissionToken,
        commands: planResult.commands,
        state: planResult.state,
        permit2Funding: planResult.permit2Funding,
      },
    };
  }

  const batchCallData = [...preview.preview.batchCallData];

  if (definition.commissionToken.kind === "erc20" && permit2Authorization) {
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

  const address = addresses.commissionRoad;
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

function createCommissionPlan({
  addresses,
  commission,
  definition,
  parsedVariables,
  permit2Authorization,
  publicClient,
}: {
  addresses: ReturnType<typeof getCommissionRoadAddresses>;
  commission: bigint;
  definition: ActionDefinitionV1;
  parsedVariables: Record<string, unknown>;
  permit2Authorization?: Permit2Authorization;
  publicClient: PublicClient;
}):
  | {
      success: true;
      commands: readonly Hex[];
      state: readonly Hex[];
      permit2Funding?: PreparedPermit2Funding;
    }
  | { success: false; issues: ValidationIssue[] } {
  try {
    const adapter = new ViemAdapter({ provider: publicClient });
    setGlobalAdapter(adapter);
    const planner = new WeirollPlanner();
    const stepOutputs = new Map<string, unknown>();
    let permit2Funding: PreparedPermit2Funding | undefined;

    if (definition.commissionToken.kind === "erc20") {
      if (!permit2Authorization) {
        return fail(
          "permit2",
          "Sign a Permit2 authorization for the exact commission amount before executing.",
        );
      }

      const request = createPermit2FundingRequest({
        commission,
        commissionRoadAddress: addresses.commissionRoad,
        definition,
        deadline: permit2Authorization.deadline,
        nonce: permit2Authorization.nonce,
        owner: permit2Authorization.owner,
        permit2Address: addresses.permit2,
      });
      const permit2Contract = createWeirollContract(
        adapter.getContract(addresses.permit2, permit2Abi as Abi),
        WeirollCommandFlags.CALL,
      );
      planner.add(
        permit2Contract.functions[
          "permitTransferFrom(tuple,tuple,address,bytes)"
        ](
          ...createPermit2FundingCallArgs({
            request,
            signature: permit2Authorization.signature,
          }),
        ),
      );

      permit2Funding = {
        amount: commission,
        target: addresses.permit2,
      };
    }

    for (const step of definition.steps) {
      const result = addStepToPlanner({
        adapter,
        definition,
        parsedVariables,
        planner,
        step,
        stepOutputs,
      });
      if (!result.success) {
        return result;
      }
    }

    const plan = planner.plan();
    return {
      success: true,
      commands: plan.commands as Hex[],
      state: plan.state as Hex[],
      permit2Funding,
    };
  } catch (error) {
    return fail(
      "steps",
      error instanceof Error
        ? error.message
        : "Commission Plan could not be prepared.",
    );
  }
}

function addStepToPlanner({
  adapter,
  definition,
  parsedVariables,
  planner,
  step,
  stepOutputs,
}: {
  adapter: ViemAdapter;
  definition: ActionDefinitionV1;
  parsedVariables: Record<string, unknown>;
  planner: WeirollPlanner;
  step: ActionStep;
  stepOutputs: Map<string, unknown>;
}): { success: true } | { success: false; issues: ValidationIssue[] } {
  const contract = definition.contracts.find(
    (candidate) => candidate.id === step.contractId,
  );
  if (!contract) {
    return fail("steps", `Unknown contract "${step.contractId}".`);
  }

  const weirollContract = createWeirollContract(
    adapter.getContract(step.target, contract.abi as Abi),
    getWeirollCommandFlags(step),
  );
  const functionBuilder =
    weirollContract.functions[step.functionSignature] ??
    weirollContract.functions[step.functionName];
  if (!functionBuilder) {
    return fail(
      "steps",
      `Could not find ${step.functionSignature} on ${step.target}.`,
    );
  }

  const args: unknown[] = [];
  for (const [index, binding] of step.parameters.entries()) {
    const result = resolveBinding({
      binding,
      abiType: step.inputs[index]?.type,
      parsedVariables,
      stepOutputs,
    });

    if (!result.success) {
      return { success: false, issues: [result.issue] };
    }

    args.push(result.value);
  }

  let call = functionBuilder(...args);
  if (step.callValue) {
    const valueResult = resolveBinding({
      binding: step.callValue,
      abiType: "uint256",
      parsedVariables,
      stepOutputs,
    });
    if (!valueResult.success) {
      return { success: false, issues: [valueResult.issue] };
    }

    call = call.withValue(BigInt(String(valueResult.value)) as never);
  }

  const output = planner.add(call);
  if (step.outputs.length === 1) {
    if (!output) {
      return fail(
        "steps",
        `${step.functionSignature} did not produce a usable Step Output.`,
      );
    }
    stepOutputs.set(getStepOutputKey(step.id, 0), output);
  }

  return { success: true };
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

    if (isIntegerAbiType(variable.type)) {
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

function isIntegerAbiType(type: string): boolean {
  return type.startsWith("uint") || type.startsWith("int");
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

function getKnownStepEthValue({
  definition,
  parsedVariables,
}: {
  definition: ActionDefinitionV1;
  parsedVariables: Record<string, unknown>;
}):
  | { success: true; value: bigint }
  | { success: false; issues: ValidationIssue[] } {
  let value = 0n;

  for (const step of definition.steps) {
    if (!step.callValue) {
      continue;
    }

    const result = resolveBinding({
      binding: step.callValue,
      abiType: "uint256",
      parsedVariables,
    });
    if (!result.success) {
      return { success: false, issues: [result.issue] };
    }

    value += BigInt(String(result.value));
  }

  return { success: true, value };
}

function resolveBinding({
  binding,
  abiType,
  parsedVariables,
  stepOutputs,
}: {
  binding: ContractParameterBinding;
  abiType?: string;
  parsedVariables: Record<string, unknown>;
  stepOutputs?: Map<string, unknown>;
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
    const value = stepOutputs?.get(
      getStepOutputKey(binding.stepId, binding.outputIndex),
    );
    if (value !== undefined) {
      return { success: true, value };
    }

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

function getWeirollCommandFlags(step: ActionStep): WeirollCommandFlags {
  if (step.stateMutability === "view" || step.stateMutability === "pure") {
    return WeirollCommandFlags.STATICCALL;
  }

  return WeirollCommandFlags.CALL;
}

function getStepOutputKey(stepId: string, outputIndex: number): string {
  return `${stepId}:${outputIndex}`;
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

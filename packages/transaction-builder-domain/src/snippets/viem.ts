import type { ActionDefinitionV1 } from "../schema";
import {
  createSnippetContext,
  formatPlanStepLines,
  type SnippetOptions,
} from "./shared";

export function generateViemSnippet(
  definition: ActionDefinitionV1,
  options?: SnippetOptions,
): string {
  const context = createSnippetContext(definition);
  const functionName = options?.functionName ?? context.functionName;

  if (context.actionShape === "commissionPlan") {
    return generateViemPlanSnippet(context, functionName);
  }

  const viemImports = [
    "encodeFunctionData",
    context.usesFlatCommission ? "parseUnits" : undefined,
    "type Address",
    "type Hex",
    context.usesPermit2Funding ? "type PublicClient" : undefined,
    "type WalletClient",
  ]
    .filter(Boolean)
    .join(", ");
  const publicClientArg = context.usesPermit2Funding
    ? "  publicClient: PublicClient;\n"
    : "";
  const publicClientDestructure = context.usesPermit2Funding
    ? "  publicClient,\n"
    : "";
  const permit2Setup = context.usesPermit2Funding
    ? `
  const permit2Deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60);
  const permit2Nonce = BigInt(Date.now());
  const permit2Permit = {
    permitted: {
      token: "${context.commissionToken}" as Address,
      amount: commission,
    },
    nonce: permit2Nonce,
    deadline: permit2Deadline,
  };
  const permit2TransferDetails = {
    to: "${context.commissionRoadAddress}" as Address,
    requestedAmount: commission,
  };
  const permit2Allowance = await publicClient.readContract({
    address: "${context.commissionToken}" as Address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, "${context.permit2Address}" as Address],
  });
  if (permit2Allowance < commission) {
    const approvalHash = await walletClient.writeContract({
      account,
      address: "${context.commissionToken}" as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: ["${context.permit2Address}" as Address, commission],
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }
  const permit2Signature = await walletClient.signTypedData({
    account,
    domain: {
      name: "Permit2",
      chainId: ${context.chainId},
      verifyingContract: "${context.permit2Address}" as Address,
    },
    primaryType: "PermitTransferFrom",
    types: permit2TypedDataTypes,
    message: { ...permit2Permit, spender: "${context.commissionRoadAddress}" as Address },
  });
  const permit2FundingCall = {
    target: "${context.permit2Address}" as Address,
    callData: encodeFunctionData({
      abi: permit2Abi,
      functionName: "permitTransferFrom",
      args: [permit2Permit, permit2TransferDetails, account, permit2Signature],
    }),
    value: 0n,
  };
`
    : "";
  const batchPrefix = context.usesPermit2Funding
    ? "  permit2FundingCall,\n"
    : "";
  const extraAbis = context.usesPermit2Funding
    ? `
const erc20Abi = ${context.erc20AbiLiteral} as const;

const permit2Abi = ${context.permit2AbiLiteral} as const;

const permit2TypedDataTypes = ${context.permit2TypedDataTypesLiteral} as const;
`
    : "";

  return `import { ${viemImports} } from "viem";

const commissionRoadAbi = ${context.commissionRoadAbiLiteral} as const;
${extraAbis}

${context.contractAbiLines}

export interface ${functionName}Args {
${publicClientArg}  walletClient: WalletClient;
  account: Address;
${context.variableTypeLines}
}

export async function ${functionName}({
${publicClientDestructure}  walletClient,
  account,
${context.variables.map((variable) => `  ${variable.name},`).join("\n")}
}: ${functionName}Args) {
  const commission = ${context.commissionExpression};
${permit2Setup}
  const batchCallData = [
${batchPrefix}${context.batchCallLines},
  ];

  return walletClient.writeContract({
    account,
    address: "${context.addresses.commissionRoad}",
    abi: commissionRoadAbi,
    functionName: "commissionCall",
    args: [
      batchCallData,
      ${BigInt(context.nftId)}n,
      "${context.commissionToken}",
      commission,
    ],
    value: ${context.totalValueExpression},
  });
}
`;
}

function generateViemPlanSnippet(
  context: ReturnType<typeof createSnippetContext>,
  functionName: string,
): string {
  const viemImports = [
    context.usesFlatCommission ? "parseUnits" : undefined,
    "type Address",
    "type Hex",
    "type PublicClient",
    "type WalletClient",
  ]
    .filter(Boolean)
    .join(", ");
  const extraAbis = context.usesPermit2Funding
    ? `
const erc20Abi = ${context.erc20AbiLiteral} as const;

const permit2Abi = ${context.permit2AbiLiteral} as const;

const permit2TypedDataTypes = ${context.permit2TypedDataTypesLiteral} as const;
`
    : "";
  const permit2Setup = context.usesPermit2Funding
    ? `
  const permit2Deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60);
  const permit2Nonce = BigInt(Date.now());
  const permit2Permit = {
    permitted: {
      token: "${context.commissionToken}" as Address,
      amount: commission,
    },
    nonce: permit2Nonce,
    deadline: permit2Deadline,
  };
  const permit2TransferDetails = {
    to: "${context.commissionRoadAddress}" as Address,
    requestedAmount: commission,
  };
  const permit2Allowance = await publicClient.readContract({
    address: "${context.commissionToken}" as Address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, "${context.permit2Address}" as Address],
  });
  if (permit2Allowance < commission) {
    const approvalHash = await walletClient.writeContract({
      account,
      address: "${context.commissionToken}" as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: ["${context.permit2Address}" as Address, commission],
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }
  const permit2Signature = await walletClient.signTypedData({
    account,
    domain: {
      name: "Permit2",
      chainId: ${context.chainId},
      verifyingContract: "${context.permit2Address}" as Address,
    },
    primaryType: "PermitTransferFrom",
    types: permit2TypedDataTypes,
    message: { ...permit2Permit, spender: "${context.commissionRoadAddress}" as Address },
  });
  const permit2Contract = createWeirollContract(
    adapter.getContract("${context.permit2Address}" as Address, permit2Abi),
    WeirollCommandFlags.CALL,
  );
  planner.add(
    permit2Contract.functions["permitTransferFrom(tuple,tuple,address,bytes)"](
      permit2Permit,
      permit2TransferDetails,
      account,
      permit2Signature,
    ),
  );
`
    : "";

  return `import { setGlobalAdapter } from "@cowprotocol/sdk-common";
import {
  WeirollCommandFlags,
  WeirollPlanner,
  createWeirollContract,
} from "@cowprotocol/sdk-weiroll";
import { ViemAdapter } from "@cowprotocol/sdk-viem-adapter";
import { ${viemImports} } from "viem";

const commissionRoadAbi = ${context.commissionRoadAbiLiteral} as const;
${extraAbis}

${context.contractAbiLines}

export interface ${functionName}Args {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Address;
${context.variableTypeLines}
}

export async function ${functionName}({
  publicClient,
  walletClient,
  account,
${context.variables.map((variable) => `  ${variable.name},`).join("\n")}
}: ${functionName}Args) {
  const adapter = new ViemAdapter({ provider: publicClient });
  setGlobalAdapter(adapter);
  const planner = new WeirollPlanner();
  const commission = ${context.commissionExpression};
${permit2Setup}
${formatPlanStepLines(context.definition)}

  const { commands, state } = planner.plan();

  return walletClient.writeContract({
    account,
    address: "${context.addresses.commissionRoad}",
    abi: commissionRoadAbi,
    functionName: "commissionPlan",
    args: [
      commands as Hex[],
      state as Hex[],
      ${BigInt(context.nftId)}n,
      "${context.commissionToken}",
      commission,
    ],
    value: ${context.totalValueExpression},
  });
}
`;
}

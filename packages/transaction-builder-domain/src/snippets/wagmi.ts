import type { ActionDefinitionV1 } from "../schema";
import { createSnippetContext, type SnippetOptions } from "./shared";

export function generateWagmiSnippet(
  definition: ActionDefinitionV1,
  options?: SnippetOptions,
): string {
  const context = createSnippetContext(definition);
  const functionName = options?.functionName ?? context.functionName;
  const hookName = `use${functionName.charAt(0).toUpperCase()}${functionName.slice(1)}`;
  const viemImports = [
    "encodeFunctionData",
    context.usesFlatCommission ? "parseUnits" : undefined,
    "type Address",
    "type Hex",
  ]
    .filter(Boolean)
    .join(", ");
  const wagmiImports = [
    context.usesPermit2Funding ? "usePublicClient" : undefined,
    "useWriteContract",
    context.usesPermit2Funding ? "useSignTypedData" : undefined,
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
  const signHook = context.usesPermit2Funding
    ? "  const { signTypedDataAsync } = useSignTypedData();\n"
    : "";
  const publicClientHook = context.usesPermit2Funding
    ? "  const publicClient = usePublicClient();\n"
    : "";
  const callbackDependency = context.usesPermit2Funding
    ? "[publicClient, signTypedDataAsync, writeContractAsync]"
    : "[writeContractAsync]";
  const permit2Setup = context.usesPermit2Funding
    ? `
      if (!publicClient) {
        throw new Error("A public client is required for Permit2 preflight.");
      }

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
        const approvalHash = await writeContractAsync({
          account,
          address: "${context.commissionToken}" as Address,
          abi: erc20Abi,
          functionName: "approve",
          args: ["${context.permit2Address}" as Address, commission],
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }
      const permit2Signature = await signTypedDataAsync({
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
    ? "        permit2FundingCall,\n"
    : "";

  return `import { useCallback } from "react";
import { ${viemImports} } from "viem";
import { ${wagmiImports} } from "wagmi";

const commissionRoadAbi = ${context.commissionRoadAbiLiteral} as const;
${extraAbis}

${context.contractAbiLines}

export interface ${functionName}Args {
  account: Address;
${context.variableTypeLines}
}

export function ${hookName}() {
${publicClientHook}${signHook}
  const { writeContractAsync, ...writeState } = useWriteContract();

  const executeAction = useCallback(
    async ({ account, ${context.variableArgs} }: ${functionName}Args) => {
      const commission = ${context.commissionExpression};
${permit2Setup}
      const batchCallData = [
${batchPrefix}${context.batchCallLines},
      ];

      return writeContractAsync({
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
    },
    ${callbackDependency},
  );

  return { executeAction, ...writeState };
}
`;
}

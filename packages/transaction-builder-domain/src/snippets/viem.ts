import type { ActionDefinitionV1 } from "../schema";
import { createSnippetContext, type SnippetOptions } from "./shared";

export function generateViemSnippet(
  definition: ActionDefinitionV1,
  options?: SnippetOptions,
): string {
  const context = createSnippetContext(definition);
  const functionName = options?.functionName ?? context.functionName;

  return `import { encodeFunctionData, type Address, type Hex, type WalletClient } from "viem";

const commissionRoadAbi = ${context.commissionRoadAbiLiteral} as const;

${context.contractAbiLines}

export interface ${functionName}Args {
  walletClient: WalletClient;
  account: Address;
${context.variableTypeLines}
}

export async function ${functionName}({
  walletClient,
  account,
${context.variables.map((variable) => `  ${variable.name},`).join("\n")}
}: ${functionName}Args) {
  const commission = ${context.commissionExpression};
  const batchCallData = [
${context.batchCallLines},
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

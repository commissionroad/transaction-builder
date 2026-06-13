import type { ActionDefinitionV1 } from "../schema";
import { createSnippetContext, type SnippetOptions } from "./shared";

export function generateWagmiSnippet(
  definition: ActionDefinitionV1,
  options?: SnippetOptions,
): string {
  const context = createSnippetContext(definition);
  const functionName = options?.functionName ?? context.functionName;
  const hookName = `use${functionName.charAt(0).toUpperCase()}${functionName.slice(1)}`;

  return `import { useCallback } from "react";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { useWriteContract } from "wagmi";

const commissionRoadAbi = ${context.commissionRoadAbiLiteral} as const;

${context.contractAbiLines}

export interface ${functionName}Args {
  account: Address;
${context.variableTypeLines}
}

export function ${hookName}() {
  const { writeContractAsync, ...writeState } = useWriteContract();

  const executeAction = useCallback(
    async ({ account, ${context.variableArgs} }: ${functionName}Args) => {
      const commission = ${context.commissionExpression};
      const batchCallData = [
${context.batchCallLines},
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
    [writeContractAsync],
  );

  return { executeAction, ...writeState };
}
`;
}

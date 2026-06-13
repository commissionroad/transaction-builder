import {
  erc20Abi,
  getCommissionRoadAddresses,
} from "@transaction-builder/commissionroad-protocol";
import {
  createPermit2FundingRequest,
  type Address,
} from "@transaction-builder/domain";
import { useEffect, useMemo, useState } from "react";
import type {
  Permit2Authorization,
  PreviewCommissionCallResult,
} from "src/transactions/commissionCall";
import {
  useAccount,
  useReadContract,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { ActionDefinitionV1 } from "@transaction-builder/domain";

export type Permit2Preflight =
  | {
      kind: "not-required";
      canExecute: true;
    }
  | {
      kind: "erc20";
      approval: {
        approve: () => void;
        error: Error | null;
        isDone: boolean;
        isLoading: boolean;
        isPending: boolean;
        needsApproval: boolean;
      };
      authorization: Permit2Authorization | undefined;
      canExecute: boolean;
      isConnected: boolean;
      signature: {
        error: Error | null;
        isDone: boolean;
        isPending: boolean;
        sign: () => Promise<void>;
      };
    };

export function usePermit2Preflight({
  definition,
  preview,
}: {
  definition: ActionDefinitionV1;
  preview: PreviewCommissionCallResult;
}): Permit2Preflight {
  const { address, isConnected } = useAccount();
  const [authorization, setAuthorization] = useState<
    Permit2Authorization | undefined
  >();
  const addresses = getCommissionRoadAddresses(definition.chainId);
  const token =
    definition.commissionToken.kind === "erc20"
      ? definition.commissionToken.address
      : undefined;
  const amount = preview.success ? preview.preview.commission : 0n;
  const enabled =
    definition.commissionToken.kind === "erc20" &&
    preview.success &&
    !!address &&
    amount > 0n;
  const allowance = useReadContract({
    address: token ?? ZERO_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? ZERO_ADDRESS, addresses.permit2],
    chainId: definition.chainId,
    query: { enabled },
  });
  const approval = useWriteContract();
  const approvalReceipt = useWaitForTransactionReceipt({
    hash: approval.data,
  });
  const signature = useSignTypedData();

  useEffect(() => {
    setAuthorization(undefined);
  }, [address, amount, definition.chainId, token]);

  const approvalAmount = useMemo(() => {
    return typeof allowance.data === "bigint" ? allowance.data : 0n;
  }, [allowance.data]);

  if (definition.commissionToken.kind !== "erc20") {
    return { kind: "not-required", canExecute: true };
  }

  const approvalDone =
    !enabled || approvalAmount >= amount || approvalReceipt.isSuccess;
  const needsApproval = enabled && !approvalDone;

  const approve = () => {
    if (!enabled || !token) {
      return;
    }

    approval.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [addresses.permit2, amount],
      chainId: definition.chainId,
    });
  };

  const sign = async () => {
    if (!enabled || !address || !preview.success) {
      return;
    }

    const nonce = createPermit2Nonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60);
    const request = createPermit2FundingRequest({
      commission: amount,
      commissionRoadAddress: addresses.commissionRoad,
      definition,
      deadline,
      nonce,
      owner: address,
      permit2Address: addresses.permit2,
    });
    const signed = await signature.signTypedDataAsync({
      domain: request.domain,
      message: request.message,
      primaryType: request.primaryType,
      types: request.types,
    });

    setAuthorization({
      owner: address,
      signature: signed,
      nonce,
      deadline,
    });
  };

  return {
    kind: "erc20",
    approval: {
      approve,
      error: approval.error ?? allowance.error ?? null,
      isDone: approvalDone,
      isLoading: allowance.isLoading || approvalReceipt.isLoading,
      isPending: approval.isPending,
      needsApproval,
    },
    authorization,
    canExecute: isConnected && approvalDone && !!authorization,
    isConnected,
    signature: {
      error: signature.error,
      isDone: !!authorization,
      isPending: signature.isPending,
      sign,
    },
  };
}

function createPermit2Nonce(): bigint {
  const crypto = globalThis.crypto;
  if (crypto?.getRandomValues) {
    const values = new Uint32Array(4);
    crypto.getRandomValues(values);
    return values.reduce((nonce, value) => (nonce << 32n) + BigInt(value), 0n);
  }

  return BigInt(Date.now());
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

import {
  commissionRoadAbi,
  getCommissionRoadAddresses,
} from "@transaction-builder/commissionroad-protocol";
import {
  getActionTargets,
  type ActionDefinitionV1,
  type Address,
} from "@transaction-builder/domain";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { usePublicClient } from "wagmi";

export type AllowlistStatus =
  | {
      state: "not-selected";
      blockedTargets: Address[];
    }
  | {
      state: "loading";
      blockedTargets: Address[];
    }
  | {
      state: "allowlist-disabled";
      blockedTargets: Address[];
    }
  | {
      state: "allowed";
      blockedTargets: Address[];
    }
  | {
      state: "blocked";
      blockedTargets: Address[];
    }
  | {
      state: "error";
      blockedTargets: Address[];
      message: string;
    };

export function useAllowlistStatus(
  definition: ActionDefinitionV1 | undefined,
): AllowlistStatus {
  const chainId = definition?.chainId ?? 1;
  const publicClient = usePublicClient({ chainId });
  const targets = useMemo(
    () => (definition ? getActionTargets(definition) : []),
    [definition],
  );
  const nftId = definition?.commissionRoadNftId;
  const query = useQuery({
    queryKey: ["allowlist-status", chainId, nftId, targets],
    enabled: !!definition && !!nftId && !!publicClient,
    retry: 1,
    queryFn: async (): Promise<AllowlistStatus> => {
      if (!definition || !nftId || !publicClient) {
        return { state: "not-selected", blockedTargets: [] };
      }

      const addresses = getCommissionRoadAddresses(definition.chainId);
      const parsedNftId = BigInt(nftId);
      const isEnabled = await publicClient.readContract({
        address: addresses.commissionRoad,
        abi: commissionRoadAbi,
        functionName: "isAllowlistEnabled",
        args: [parsedNftId],
      });

      if (!isEnabled) {
        return { state: "allowlist-disabled", blockedTargets: [] };
      }

      const targetResults = await Promise.all(
        targets.map(async (target) => ({
          target,
          allowed: await publicClient.readContract({
            address: addresses.commissionRoad,
            abi: commissionRoadAbi,
            functionName: "isCallTargetAllowlisted",
            args: [parsedNftId, target],
          }),
        })),
      );
      const blockedTargets = targetResults
        .filter((result) => !result.allowed)
        .map((result) => result.target);

      return blockedTargets.length
        ? { state: "blocked", blockedTargets }
        : { state: "allowed", blockedTargets: [] };
    },
  });

  if (!definition?.commissionRoadNftId) {
    return { state: "not-selected", blockedTargets: [] };
  }

  if (query.isLoading || query.isPending) {
    return { state: "loading", blockedTargets: [] };
  }

  if (query.isError) {
    return {
      state: "error",
      blockedTargets: [],
      message:
        query.error instanceof Error
          ? query.error.message
          : "Unable to verify the NFT allowlist.",
    };
  }

  return query.data ?? { state: "loading", blockedTargets: [] };
}

export function isAllowlistBlocking(status: AllowlistStatus): boolean {
  return status.state === "blocked";
}

export function isAllowlistPending(status: AllowlistStatus): boolean {
  return status.state === "loading";
}

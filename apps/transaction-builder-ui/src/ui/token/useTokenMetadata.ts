import { erc20Abi } from "@transaction-builder/commissionroad-protocol";
import type {
  Address,
  SupportedActionChainId,
} from "@transaction-builder/domain";
import { useMemo } from "react";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";

export interface TokenMetadata {
  address: Address;
  name?: string;
  symbol?: string;
  decimals?: number;
}

export interface UseTokenMetadataResult {
  enabled: boolean;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  metadata: TokenMetadata | undefined;
}

export function useTokenMetadata({
  address,
  chainId,
}: {
  address: string | undefined;
  chainId: SupportedActionChainId;
}): UseTokenMetadataResult {
  const enabled = !!address && isAddress(address);
  const checksummedAddress = enabled ? (address as Address) : undefined;
  const reads = useReadContracts({
    contracts: checksummedAddress
      ? [
          {
            address: checksummedAddress,
            abi: erc20Abi,
            functionName: "name",
            chainId,
          },
          {
            address: checksummedAddress,
            abi: erc20Abi,
            functionName: "symbol",
            chainId,
          },
          {
            address: checksummedAddress,
            abi: erc20Abi,
            functionName: "decimals",
            chainId,
          },
        ]
      : [],
    query: { enabled },
  });

  const metadata = useMemo<TokenMetadata | undefined>(() => {
    if (!checksummedAddress || !reads.data) {
      return undefined;
    }

    const [name, symbol, decimals] = reads.data as Array<{
      result?: unknown;
      status: "success" | "failure";
    }>;

    return {
      address: checksummedAddress,
      name: name?.status === "success" ? String(name.result) : undefined,
      symbol: symbol?.status === "success" ? String(symbol.result) : undefined,
      decimals:
        decimals?.status === "success" && typeof decimals.result === "number"
          ? decimals.result
          : undefined,
    };
  }, [checksummedAddress, reads.data]);

  return {
    enabled,
    error: reads.error,
    isError: reads.isError,
    isLoading: reads.isLoading,
    metadata,
  };
}

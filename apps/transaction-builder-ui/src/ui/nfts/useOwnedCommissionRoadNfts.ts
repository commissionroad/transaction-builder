import { useQuery } from "@tanstack/react-query";
import type { SupportedChainId } from "@transaction-builder/commissionroad-protocol";
import {
  getCommissionRoadPortfolioNfts,
  type CommissionRoadPortfolioNft,
} from "src/network/apiClient";
import { useAccount } from "wagmi";

export interface OwnedCommissionRoadNft {
  id: string;
  name?: string;
}

export function useOwnedCommissionRoadNfts(chainId: SupportedChainId) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["owned-commissionroad-nfts", chainId, address],
    enabled: !!address,
    staleTime: 30_000,
    queryFn: async ({ signal }): Promise<OwnedCommissionRoadNft[]> => {
      if (!address) {
        return [];
      }

      const portfolioNfts = await getCommissionRoadPortfolioNfts(address, {
        signal,
      });

      return getOwnedCommissionRoadNftsForChain(portfolioNfts, chainId);
    },
  });
}

export function getOwnedCommissionRoadNftsForChain(
  portfolioNfts: CommissionRoadPortfolioNft[],
  chainId: SupportedChainId,
): OwnedCommissionRoadNft[] {
  return portfolioNfts
    .filter((nft) => nft.chainId === chainId)
    .map((nft) => ({ id: nft.id.toString(), name: nft.name }));
}

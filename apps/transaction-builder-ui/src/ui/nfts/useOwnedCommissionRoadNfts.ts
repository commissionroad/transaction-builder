import {
  commissionRoadErc721Abi,
  getCommissionRoadAddresses,
  type SupportedChainId,
} from "@transaction-builder/commissionroad-protocol";
import { useQuery } from "@tanstack/react-query";
import { getAbiItem, type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";

export interface OwnedCommissionRoadNft {
  id: string;
  name?: string;
}

export function useOwnedCommissionRoadNfts(chainId: SupportedChainId) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId });

  return useQuery({
    queryKey: ["owned-commissionroad-nfts", chainId, address],
    enabled: !!address && !!publicClient,
    staleTime: 30_000,
    queryFn: async (): Promise<OwnedCommissionRoadNft[]> => {
      if (!address || !publicClient) {
        return [];
      }

      const addresses = getCommissionRoadAddresses(chainId);
      const transferEvent = getAbiItem({
        abi: commissionRoadErc721Abi,
        name: "Transfer",
      });
      const transferLogs = await publicClient.getLogs({
        address: addresses.commissionRoadERC721,
        event: transferEvent,
        args: { to: address },
        fromBlock: addresses.deployBlock,
        toBlock: "latest",
      });
      const uniqueIds = Array.from(
        new Set(
          transferLogs
            .map((log) => log.args.id)
            .filter((id): id is bigint => typeof id === "bigint"),
        ),
      );
      const ownedNfts = await Promise.all(
        uniqueIds.map(async (id) => {
          const owner = await publicClient
            .readContract({
              address: addresses.commissionRoadERC721,
              abi: commissionRoadErc721Abi,
              functionName: "ownerOf",
              args: [id],
            })
            .catch(() => null);

          if (!isSameAddress(owner, address)) {
            return null;
          }

          const metadata = await publicClient
            .readContract({
              address: addresses.commissionRoadERC721,
              abi: commissionRoadErc721Abi,
              functionName: "getMetadata",
              args: [id],
            })
            .catch(() => null);

          const name = getMetadataName(metadata);
          return name ? { id: id.toString(), name } : { id: id.toString() };
        }),
      );

      return ownedNfts.filter(
        (nft): nft is NonNullable<typeof nft> => nft !== null,
      );
    },
  });
}

function isSameAddress(
  left: Address | string | null | undefined,
  right: Address,
): boolean {
  return left?.toLowerCase() === right.toLowerCase();
}

function getMetadataName(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || !("name" in metadata)) {
    return undefined;
  }

  const name = metadata.name;
  return typeof name === "string" && name ? name : undefined;
}

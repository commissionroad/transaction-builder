import {
  commissionRoadErc721Abi,
  getCommissionRoadAddresses,
} from "@transaction-builder/commissionroad-protocol";
import type { SupportedActionChainId } from "@transaction-builder/domain";
import { useMemo } from "react";
import { useReadContract } from "wagmi";

export interface CommissionRoadNftMetadata {
  imageUrl?: string;
  name?: string;
}

export function useCommissionRoadNftMetadata({
  chainId,
  nftId,
}: {
  chainId: SupportedActionChainId;
  nftId: string | undefined;
}) {
  const tokenId = parseNftId(nftId);
  const addresses = getCommissionRoadAddresses(chainId);
  const tokenUri = useReadContract({
    address: addresses.commissionRoadERC721,
    abi: commissionRoadErc721Abi,
    functionName: "tokenURI",
    args: [tokenId ?? 0n],
    chainId,
    query: { enabled: tokenId !== undefined },
  });
  const metadata = useMemo(
    () =>
      typeof tokenUri.data === "string"
        ? parseTokenUriMetadata(tokenUri.data)
        : undefined,
    [tokenUri.data],
  );

  return {
    error: tokenUri.error,
    isError: tokenUri.isError,
    isLoading: tokenUri.isLoading,
    metadata,
  };
}

function parseNftId(nftId: string | undefined): bigint | undefined {
  if (!nftId || !/^\d+$/.test(nftId)) {
    return undefined;
  }

  return BigInt(nftId);
}

export function parseTokenUriMetadata(
  tokenUri: string,
): CommissionRoadNftMetadata | undefined {
  const metadata = parseInlineJson(tokenUri);
  if (!metadata) {
    return undefined;
  }

  return {
    imageUrl: getSafeImageSource(metadata),
    name: typeof metadata.name === "string" ? metadata.name : undefined,
  };
}

function parseInlineJson(
  tokenUri: string,
): Record<string, unknown> | undefined {
  try {
    if (tokenUri.startsWith("data:application/json;base64,")) {
      return JSON.parse(
        atob(tokenUri.replace("data:application/json;base64,", "")),
      ) as Record<string, unknown>;
    }

    if (tokenUri.startsWith("data:application/json,")) {
      const [, encodedJson] = tokenUri.split(",", 2);
      return JSON.parse(decodeURIComponent(encodedJson ?? "")) as Record<
        string,
        unknown
      >;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function getSafeImageSource(
  metadata: Record<string, unknown>,
): string | undefined {
  const rawImage =
    metadata.image_data ?? metadata.image ?? metadata.imageUrl ?? undefined;

  if (typeof rawImage !== "string") {
    return undefined;
  }

  if (
    rawImage.startsWith("data:image/") ||
    rawImage.startsWith("https://") ||
    rawImage.startsWith("http://")
  ) {
    return rawImage;
  }

  return undefined;
}

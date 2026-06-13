import classNames from "classnames";
import { useCommissionRoadNftMetadata } from "./useCommissionRoadNftMetadata";
import type { OwnedCommissionRoadNft } from "./useOwnedCommissionRoadNfts";
import type { SupportedActionChainId } from "@transaction-builder/domain";

export function CommissionRoadNftThumbnail({
  chainId,
  className,
  nft,
}: {
  chainId: SupportedActionChainId;
  className?: string;
  nft: OwnedCommissionRoadNft | undefined;
}) {
  const metadata = useCommissionRoadNftMetadata({
    chainId,
    nftId: nft?.id,
  });
  const imageUrl = nft?.imageUrl ?? metadata.metadata?.imageUrl;
  const label = nft?.name ?? metadata.metadata?.name ?? `NFT #${nft?.id ?? ""}`;

  return (
    <span
      className={classNames(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-base-300 bg-base-200 text-[10px] font-semibold text-base-content/60",
        className,
      )}
    >
      {imageUrl ? (
        <img
          alt={label}
          className="size-full object-cover"
          loading="lazy"
          src={imageUrl}
        />
      ) : nft?.id ? (
        `#${nft.id}`
      ) : (
        <img
          alt=""
          aria-hidden="true"
          className="size-5 opacity-70"
          src="/commissionRoadLogo.svg"
        />
      )}
    </span>
  );
}

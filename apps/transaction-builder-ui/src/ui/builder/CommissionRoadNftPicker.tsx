import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Check, ChevronDown, ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { CommissionRoadNftThumbnail } from "src/ui/nfts/CommissionRoadNftThumbnail";
import {
  useOwnedCommissionRoadNfts,
  type OwnedCommissionRoadNft,
} from "src/ui/nfts/useOwnedCommissionRoadNfts";
import type { BuilderDraft } from "./builderState";

const MINT_URL = "https://commissionroad.xyz/mint";

export function CommissionRoadNftPicker({
  draft,
  onChange,
}: {
  draft: BuilderDraft;
  onChange: (draft: BuilderDraft) => void;
}) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const nftsQuery = useOwnedCommissionRoadNfts(draft.chainId);
  const nfts = nftsQuery.data ?? [];
  const selectedNft = nfts.find((nft) => nft.id === draft.commissionRoadNftId);

  return (
    <div className="grid gap-2">
      <div className="daisy-form-control">
        <div className="daisy-label pb-2" id="cr-nft-label">
          <span className="daisy-label-text font-medium">
            CommissionRoad NFT
          </span>
        </div>
        {isConnected ? (
          <NftDropdown
            draft={draft}
            isLoading={nftsQuery.isLoading}
            nfts={nfts}
            onChange={onChange}
            selectedNft={selectedNft}
          />
        ) : (
          <button
            className="daisy-btn daisy-btn-outline w-full justify-start"
            onClick={openConnectModal}
            type="button"
          >
            Connect wallet to select
          </button>
        )}
      </div>

      {isConnected && !nftsQuery.isLoading && !nfts.length ? (
        <a
          className="daisy-btn daisy-btn-sm"
          href={MINT_URL}
          rel="noreferrer"
          target="_blank"
        >
          Mint CommissionRoad NFT
          <ExternalLink className="size-4" />
        </a>
      ) : null}
    </div>
  );
}

function NftDropdown({
  draft,
  isLoading,
  nfts,
  onChange,
  selectedNft,
}: {
  draft: BuilderDraft;
  isLoading: boolean;
  nfts: OwnedCommissionRoadNft[];
  onChange: (draft: BuilderDraft) => void;
  selectedNft: OwnedCommissionRoadNft | undefined;
}) {
  const disabled = isLoading || !nfts.length;
  const placeholder = getEmptyOptionLabel({
    isConnected: true,
    isLoading,
  });

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        aria-labelledby="cr-nft-label"
        className="flex h-11 w-full items-center gap-3 rounded-md border border-base-300 bg-base-100 px-3 text-base-content/50"
        role="button"
      >
        <CommissionRoadNftThumbnail chainId={draft.chainId} nft={undefined} />
        <span className="truncate">{placeholder}</span>
      </div>
    );
  }

  return (
    <details className="daisy-dropdown w-full">
      <summary
        aria-labelledby="cr-nft-label cr-nft-value"
        className="flex h-11 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-base-300 bg-base-100 px-3 text-base font-normal text-base-content transition hover:border-base-content/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden"
      >
        <NftOptionContent
          chainId={draft.chainId}
          id="cr-nft-value"
          nft={selectedNft}
          placeholder={placeholder}
        />
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </summary>
      <ul className="daisy-menu daisy-dropdown-content z-20 mt-2 w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
        <li>
          <button
            className="grid grid-cols-[2rem_minmax(0,1fr)_1rem] items-center gap-3"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              onChange({ ...draft, commissionRoadNftId: undefined });
            }}
            type="button"
          >
            <CommissionRoadNftThumbnail
              chainId={draft.chainId}
              nft={undefined}
            />
            <span className="truncate text-left">Select NFT</span>
            {!draft.commissionRoadNftId ? (
              <Check className="size-4 text-secondary" />
            ) : null}
          </button>
        </li>
        {nfts.map((nft) => {
          const isSelected = nft.id === draft.commissionRoadNftId;

          return (
            <li key={nft.id}>
              <button
                className="grid grid-cols-[2rem_minmax(0,1fr)_1rem] items-center gap-3"
                onClick={(event) => {
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                  onChange({
                    ...draft,
                    commissionRoadNftId: nft.id,
                  });
                }}
                type="button"
              >
                <CommissionRoadNftThumbnail chainId={draft.chainId} nft={nft} />
                <span className="truncate text-left">
                  {formatNftLabel(nft)}
                </span>
                {isSelected ? (
                  <Check className="size-4 text-secondary" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function NftOptionContent({
  chainId,
  id,
  nft,
  placeholder,
}: {
  chainId: BuilderDraft["chainId"];
  id: string;
  nft: OwnedCommissionRoadNft | undefined;
  placeholder: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3" id={id}>
      <CommissionRoadNftThumbnail chainId={chainId} nft={nft} />
      <span className="truncate">
        {nft ? formatNftLabel(nft) : placeholder}
      </span>
    </span>
  );
}

function formatNftLabel(nft: OwnedCommissionRoadNft): string {
  return nft.name ? `${nft.name} (#${nft.id})` : `NFT #${nft.id}`;
}

function getEmptyOptionLabel({
  isConnected,
  isLoading,
}: {
  isConnected: boolean;
  isLoading: boolean;
}): string {
  if (!isConnected) {
    return "Connect wallet to select";
  }

  if (isLoading) {
    return "Loading NFTs";
  }

  return "Select NFT";
}

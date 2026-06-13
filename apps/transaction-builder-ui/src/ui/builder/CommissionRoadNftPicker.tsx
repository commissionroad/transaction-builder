import { ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { useOwnedCommissionRoadNfts } from "src/ui/nfts/useOwnedCommissionRoadNfts";
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
  const nftsQuery = useOwnedCommissionRoadNfts(draft.chainId);
  const nfts = nftsQuery.data ?? [];

  return (
    <div className="grid gap-2">
      <label className="daisy-form-control">
        <span className="daisy-label pb-2">
          <span className="daisy-label-text font-medium">
            CommissionRoad NFT
          </span>
        </span>
        <select
          aria-label="CommissionRoad NFT"
          className="daisy-select daisy-select-bordered w-full"
          disabled={!isConnected || nftsQuery.isLoading || !nfts.length}
          value={draft.commissionRoadNftId ?? ""}
          onChange={(event) =>
            onChange({
              ...draft,
              commissionRoadNftId: event.target.value || undefined,
            })
          }
        >
          <option value="">
            {getEmptyOptionLabel({
              isConnected,
              isLoading: nftsQuery.isLoading,
            })}
          </option>
          {nfts.map((nft) => (
            <option key={nft.id} value={nft.id}>
              {nft.name ? `${nft.name} (#${nft.id})` : `NFT #${nft.id}`}
            </option>
          ))}
        </select>
      </label>

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

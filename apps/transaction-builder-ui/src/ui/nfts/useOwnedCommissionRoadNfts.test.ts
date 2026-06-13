import { describe, expect, it } from "bun:test";
import { getOwnedCommissionRoadNftsForChain } from "./useOwnedCommissionRoadNfts";

describe("getOwnedCommissionRoadNftsForChain", () => {
  it("keeps only NFTs owned on the selected Action Chain", () => {
    expect(
      getOwnedCommissionRoadNftsForChain(
        [
          createPortfolioNft({ id: 1, chainId: 1, name: "Mainnet NFT" }),
          createPortfolioNft({ id: 2, chainId: 8453, name: "Base NFT" }),
          createPortfolioNft({ id: 3, chainId: 11155111, name: "Sepolia NFT" }),
        ],
        8453,
      ),
    ).toEqual([{ id: "2", name: "Base NFT" }]);
  });
});

function createPortfolioNft({
  id,
  chainId,
  name,
}: {
  id: number;
  chainId: number;
  name: string;
}) {
  return {
    id,
    chainId,
    name,
    claimableBalances: [],
  };
}

import type { Address, SupportedChainId } from "./chains";

export interface CommissionRoadAddresses {
  commissionRoad: Address;
  commissionRoadERC721: Address;
  commissionRoadExecutor: Address;
  commissionVault: Address;
  createX: Address;
  permit2: Address;
  tokenURI: Address;
  deployBlock: bigint;
}

export const PERMIT2_ADDRESS =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

export const commissionRoadAddressesByChain = {
  1: {
    tokenURI: "0xcd0eb7bb5fe644adc9abcccb46134f3ecf8d4b1b",
    commissionRoadERC721: "0x5f2067ee4f4b326df0f5ce7468657d2c63cf2a11",
    commissionRoadExecutor: "0xbcaaec56f29006c723229c2d192e4eb3d01b6bef",
    commissionVault: "0xdb986df63507b48517fbbef60f5250745fec57d3",
    commissionRoad: "0xc12dC152f12CaABF68F101Dbe496c4173828935E",
    permit2: PERMIT2_ADDRESS,
    createX: "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed",
    deployBlock: 24685606n,
  },
  8453: {
    tokenURI: "0x23b84c014851d7843589a4ef80869e25ba598e37",
    commissionRoadERC721: "0xcd0eb7bb5fe644adc9abcccb46134f3ecf8d4b1b",
    commissionRoadExecutor: "0xbcaaec56f29006c723229c2d192e4eb3d01b6bef",
    commissionVault: "0x5f2067ee4f4b326df0f5ce7468657d2c63cf2a11",
    commissionRoad: "0xc12dC152f12CaABF68F101Dbe496c4173828935E",
    permit2: PERMIT2_ADDRESS,
    createX: "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed",
    deployBlock: 43531198n,
  },
  11155111: {
    tokenURI: "0xfd46d28f017d4a9466d367d3d80e8dfc6cdf101d",
    commissionRoadERC721: "0x1254cbb7be769b9c4e402c89b34912c91ee7169b",
    commissionRoadExecutor: "0x72b3d80a7bed8f3e8dac60086f1e52b56d3f8d55",
    commissionVault: "0xa0481dad14ab6d1d2c04523cd4abefd0e3f14c1d",
    commissionRoad: "0xDeaB4a3F8d1d5D6f68680f8E06BC3887e4401b4D",
    permit2: PERMIT2_ADDRESS,
    createX: "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed",
    deployBlock: 10465980n,
  },
} as const satisfies Record<SupportedChainId, CommissionRoadAddresses>;

export function getCommissionRoadAddresses(
  chainId: SupportedChainId,
): CommissionRoadAddresses {
  return commissionRoadAddressesByChain[chainId];
}

import { describe, expect, it } from "bun:test";
import {
  ETH_SENTINEL,
  PERMIT2_ADDRESS,
  SUPPORTED_CHAIN_IDS,
  chainConfigs,
  commissionRoadAddressesByChain,
  getCommissionRoadAddresses,
  getExplorerConfig,
  getPermit2Address,
  isSupportedChainId,
} from "./index";

describe("CommissionRoad protocol config", () => {
  it("supports only mainnet, Base, and Sepolia", () => {
    expect(SUPPORTED_CHAIN_IDS).toEqual([1, 8453, 11155111]);
    expect(isSupportedChainId(1)).toBe(true);
    expect(isSupportedChainId(8453)).toBe(true);
    expect(isSupportedChainId(11155111)).toBe(true);
    expect(isSupportedChainId(31337)).toBe(false);
  });

  it("exports one ETH sentinel address", () => {
    expect(ETH_SENTINEL).toBe(
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    );
  });

  it("defines complete contract addresses for every supported Action Chain", () => {
    for (const chainId of SUPPORTED_CHAIN_IDS) {
      const addresses = getCommissionRoadAddresses(chainId);

      expect(addresses.commissionRoad).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(addresses.commissionRoadERC721).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(addresses.commissionRoadExecutor).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(addresses.commissionVault).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(addresses.permit2).toBe(PERMIT2_ADDRESS);
      expect(addresses.deployBlock).toBeGreaterThan(0n);
    }

    expect(Object.keys(commissionRoadAddressesByChain).map(Number)).toEqual(
      [...SUPPORTED_CHAIN_IDS],
    );
  });

  it("defines explorer config for every supported Action Chain", () => {
    for (const chainId of SUPPORTED_CHAIN_IDS) {
      const explorer = getExplorerConfig(chainId);

      expect(explorer.family).toBe("etherscan");
      expect(explorer.apiUrl).toMatch(/^https:\/\//);
      expect(explorer.browserUrl).toMatch(/^https:\/\//);
    }

    expect(Object.keys(chainConfigs).map(Number)).toEqual([
      ...SUPPORTED_CHAIN_IDS,
    ]);
  });

  it("returns the chain-specific Permit2 address", () => {
    for (const chainId of SUPPORTED_CHAIN_IDS) {
      expect(getPermit2Address(chainId)).toBe(PERMIT2_ADDRESS);
    }
  });
});

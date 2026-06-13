export type Address = `0x${string}`;

export const ETH_SENTINEL =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

export const SUPPORTED_CHAIN_IDS = [1, 8453, 11155111] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export interface ExplorerConfig {
  apiUrl: string;
  browserUrl: string;
  family: "etherscan";
  name: string;
}

export interface ChainConfig {
  chainId: SupportedChainId;
  name: string;
  displayName: string;
  explorer: ExplorerConfig;
}

export const chainConfigs = {
  1: {
    chainId: 1,
    name: "mainnet",
    displayName: "Ethereum",
    explorer: {
      family: "etherscan",
      name: "Etherscan",
      apiUrl: "https://api.etherscan.io/api",
      browserUrl: "https://etherscan.io",
    },
  },
  8453: {
    chainId: 8453,
    name: "base",
    displayName: "Base",
    explorer: {
      family: "etherscan",
      name: "BaseScan",
      apiUrl: "https://api.basescan.org/api",
      browserUrl: "https://basescan.org",
    },
  },
  11155111: {
    chainId: 11155111,
    name: "sepolia",
    displayName: "Sepolia",
    explorer: {
      family: "etherscan",
      name: "Sepolia Etherscan",
      apiUrl: "https://api-sepolia.etherscan.io/api",
      browserUrl: "https://sepolia.etherscan.io",
    },
  },
} as const satisfies Record<SupportedChainId, ChainConfig>;

export function isSupportedChainId(
  chainId: number,
): chainId is SupportedChainId {
  return SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId);
}

export function getChainConfig(chainId: SupportedChainId): ChainConfig {
  return chainConfigs[chainId];
}

export function getExplorerConfig(chainId: SupportedChainId): ExplorerConfig {
  return getChainConfig(chainId).explorer;
}

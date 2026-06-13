import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, mainnet, sepolia } from "viem/chains";
import { http } from "wagmi";

const FALLBACK_WALLET_CONNECT_PROJECT_ID = "5653462762f7814c2e3b8f6c49c418fb";

export type ChainId = typeof mainnet.id | typeof base.id | typeof sepolia.id;

export const wagmiConfig = getDefaultConfig({
  appName: "CommissionRoad Transaction Builder",
  projectId:
    import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID ??
    FALLBACK_WALLET_CONNECT_PROJECT_ID,
  chains: [mainnet, base, sepolia],
  appDescription: "Build shareable CommissionRoad Actions",
  appUrl: "https://commissionroad.xyz",
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC_URL),
    [base.id]: http(import.meta.env.VITE_BASE_RPC_URL),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
  },
});

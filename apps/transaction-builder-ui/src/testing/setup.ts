import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { mock } from "bun:test";
import { createElement, Fragment, type ReactNode } from "react";
import { base, mainnet, sepolia } from "viem/chains";
import { createConfig, http } from "wagmi";

GlobalRegistrator.register();

mock.module("@rainbow-me/rainbowkit", () => ({
  ConnectButton: {
    Custom({
      children,
    }: {
      children: (props: {
        account: undefined;
        authenticationStatus: undefined;
        chain: undefined;
        mounted: true;
        openAccountModal: () => void;
        openChainModal: () => void;
        openConnectModal: () => void;
      }) => ReactNode;
    }) {
      return createElement(
        Fragment,
        null,
        children({
          account: undefined,
          authenticationStatus: undefined,
          chain: undefined,
          mounted: true,
          openAccountModal: () => {},
          openChainModal: () => {},
          openConnectModal: () => {},
        }),
      );
    },
  },
  RainbowKitProvider({ children }: { children: ReactNode }) {
    return createElement(Fragment, null, children);
  },
  getDefaultConfig() {
    return createConfig({
      chains: [sepolia, mainnet, base],
      transports: {
        [sepolia.id]: http(),
        [mainnet.id]: http(),
        [base.id]: http(),
      },
    });
  },
  lightTheme() {
    return {};
  },
  useConnectModal() {
    return { openConnectModal: () => {} };
  },
}));

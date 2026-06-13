import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown } from "lucide-react";

export function ConnectButton() {
  return (
    <RainbowKitConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none" as const,
                userSelect: "none" as const,
              },
            })}
          >
            {!connected ? (
              <button
                className="daisy-btn daisy-btn-primary"
                onClick={openConnectModal}
                type="button"
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                className="daisy-btn daisy-btn-error"
                onClick={openChainModal}
                type="button"
              >
                Wrong network
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  className="daisy-btn daisy-btn-ghost hidden border border-base-300 sm:inline-flex"
                  onClick={openChainModal}
                  type="button"
                >
                  {chain.name}
                  <ChevronDown className="size-4 opacity-60" />
                </button>
                <button
                  className="daisy-btn daisy-btn-ghost border border-base-300"
                  onClick={openAccountModal}
                  type="button"
                >
                  {account.displayName}
                  <ChevronDown className="size-4 opacity-60" />
                </button>
              </div>
            )}
          </div>
        );
      }}
    </RainbowKitConnectButton.Custom>
  );
}

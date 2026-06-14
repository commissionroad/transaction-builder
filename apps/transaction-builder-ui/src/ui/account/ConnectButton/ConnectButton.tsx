import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import {
  getChainConfig,
  type SupportedChainId,
} from "@transaction-builder/commissionroad-protocol";
import { blo } from "blo";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { useSwitchChain } from "wagmi";

export function ConnectButton({
  requiredChainId,
}: {
  requiredChainId?: SupportedChainId | null;
} = {}) {
  const { isPending: isSwitchingChain, switchChain } = useSwitchChain();

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
                onClick={() =>
                  requiredChainId
                    ? switchChain({ chainId: requiredChainId })
                    : openChainModal()
                }
                type="button"
              >
                Wrong network
              </button>
            ) : (
              <div className="flex items-center gap-1">
                {requiredChainId ? (
                  <ActionChainButton
                    chainId={requiredChainId}
                    currentChainId={chain.id}
                    isSwitching={isSwitchingChain}
                    onClick={() => switchChain({ chainId: requiredChainId })}
                  />
                ) : requiredChainId === undefined ? (
                  <button
                    className="daisy-btn daisy-btn-ghost hidden border border-base-300 sm:inline-flex"
                    onClick={openChainModal}
                    type="button"
                  >
                    {chain.hasIcon ? (
                      <span
                        className="size-5 overflow-hidden rounded-full"
                        style={{ background: chain.iconBackground }}
                      >
                        {chain.iconUrl ? (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            className="size-5"
                            src={chain.iconUrl}
                          />
                        ) : null}
                      </span>
                    ) : null}
                    <span>{chain.name}</span>
                    <ChevronDown className="size-4 opacity-60" />
                  </button>
                ) : null}
                <button
                  className="daisy-btn daisy-btn-ghost border border-base-300"
                  onClick={openAccountModal}
                  type="button"
                >
                  {account.hasPendingTransactions ? (
                    <span className="relative mr-1 flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-warning" />
                    </span>
                  ) : (
                    <img
                      alt=""
                      aria-hidden="true"
                      className="size-5 rounded-full"
                      src={
                        account.ensAvatar ??
                        blo(account.address as `0x${string}`)
                      }
                    />
                  )}
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

function ActionChainButton({
  chainId,
  currentChainId,
  isSwitching,
  onClick,
}: {
  chainId: SupportedChainId;
  currentChainId: number;
  isSwitching: boolean;
  onClick: () => void;
}) {
  const chain = getChainConfig(chainId);
  const isCurrentChain = currentChainId === chainId;
  const isWrongNetwork = !isCurrentChain;

  return (
    <button
      className={
        isWrongNetwork
          ? "daisy-btn daisy-btn-warning hidden border border-warning sm:inline-flex"
          : "daisy-btn daisy-btn-ghost hidden border border-base-300 sm:inline-flex"
      }
      aria-disabled={isCurrentChain || isSwitching}
      disabled={isSwitching}
      onClick={() => {
        if (!isCurrentChain) {
          onClick();
        }
      }}
      type="button"
    >
      {isWrongNetwork ? null : (
        <img
          alt=""
          aria-hidden="true"
          className="size-5 rounded-full"
          src={getChainLogoSrc(chainId)}
        />
      )}
      {isWrongNetwork && !isSwitching ? (
        <AlertTriangle className="size-4" />
      ) : null}
      <span>
        {isSwitching && isWrongNetwork
          ? "Switching..."
          : isWrongNetwork
            ? `Switch to ${chain.displayName}`
            : chain.displayName}
      </span>
    </button>
  );
}

function getChainLogoSrc(chainId: SupportedChainId): string {
  if (chainId === 8453) {
    return "/base.svg";
  }

  if (chainId === 11155111) {
    return "/sepolia.svg";
  }

  return "/ethereum.svg";
}

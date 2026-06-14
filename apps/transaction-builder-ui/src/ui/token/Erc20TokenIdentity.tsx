import { getExplorerConfig } from "@transaction-builder/commissionroad-protocol";
import type {
  Address,
  SupportedActionChainId,
} from "@transaction-builder/domain";
import classNames from "classnames";
import { isAddress } from "viem";
import { useTokenMetadata } from "./useTokenMetadata";

export function Erc20TokenIdentity({
  address,
  chainId,
  className,
  label = "Token",
}: {
  address: string | undefined;
  chainId: SupportedActionChainId;
  className?: string;
  label?: string;
}) {
  const validAddress =
    address && isAddress(address) ? (address as Address) : undefined;
  const tokenMetadata = useTokenMetadata({
    address: validAddress,
    chainId,
  });

  if (!validAddress) {
    return null;
  }

  const tokenName =
    tokenMetadata.metadata?.name ??
    (tokenMetadata.isLoading ? "Looking up token" : "ERC20 token");
  const symbol = tokenMetadata.metadata?.symbol;
  const status =
    tokenMetadata.isLoading && !symbol
      ? "Loading ticker"
      : !symbol
        ? "Ticker unavailable"
        : undefined;
  const explorerUrl = `${getExplorerConfig(chainId).browserUrl}/address/${validAddress}`;

  return (
    <div
      className={classNames(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs",
        className,
      )}
    >
      <span className="font-medium text-base-content/50">{label}</span>
      <span className="min-w-0 truncate font-semibold text-base-content">
        {tokenName}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        {symbol ? (
          <span className="rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-[10px] font-semibold text-base-content/70">
            {symbol}
          </span>
        ) : (
          <span className="text-[10px] font-medium uppercase tracking-wide text-base-content/40">
            {status}
          </span>
        )}
        <a
          className="text-[10px] text-base-content/55 underline decoration-base-content/20 underline-offset-2 transition hover:text-base-content hover:decoration-base-content/50"
          href={explorerUrl}
          rel="noreferrer"
          target="_blank"
          title={`Open ${validAddress} in ${getExplorerConfig(chainId).name}`}
        >
          {formatShortAddress(validAddress)}
        </a>
      </div>
    </div>
  );
}

function formatShortAddress(address: string): string {
  return address.length > 14
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
}

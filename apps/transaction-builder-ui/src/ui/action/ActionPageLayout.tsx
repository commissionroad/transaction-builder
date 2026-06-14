import { getChainConfig } from "@transaction-builder/commissionroad-protocol";
import { getExecutableActionVariables } from "src/transactions/commissionCall";
import { type ActionDefinitionV1 } from "@transaction-builder/domain";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import { AllowlistNotice } from "src/ui/allowlist/AllowlistNotice";
import type { AllowlistStatus } from "src/ui/allowlist/useAllowlistStatus";
import { CommissionRoadNftThumbnail } from "src/ui/nfts/CommissionRoadNftThumbnail";
import { useAccount } from "wagmi";
import { ActionVariableForm } from "./ActionVariableForm";
import { getInitialActionVariableValues } from "./actionVariableDefaults";
import { TechnicalDetailsPanel } from "./TechnicalDetailsPanel";

export function ActionPageLayout({
  allowlistStatus,
  definition,
}: {
  allowlistStatus: AllowlistStatus;
  definition: ActionDefinitionV1;
}) {
  const { address, isConnected } = useAccount();
  const variables = useMemo(
    () => getExecutableActionVariables(definition),
    [definition],
  );
  const defaultRawValues = useMemo(
    () =>
      getInitialActionVariableValues({
        connectedAddress: isConnected ? address : undefined,
        definition,
        variables,
      }),
    [address, definition, isConnected, variables],
  );
  const [rawValues, setRawValues] = useState(defaultRawValues);

  useEffect(() => {
    setRawValues((current) => {
      let changed = false;
      const next = { ...current };

      for (const [name, defaultValue] of Object.entries(defaultRawValues)) {
        if (next[name] === undefined || next[name] === "") {
          next[name] = defaultValue;
          changed = changed || defaultValue !== "";
        }
      }

      return changed ? next : current;
    });
  }, [defaultRawValues]);

  return (
    <main className="overflow-x-hidden bg-[linear-gradient(180deg,#fefefe_0%,#f4f7f5_44%,#edf5f1_100%)] pb-28">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:py-10">
        <ActionHero
          align="center"
          className="mx-auto max-w-3xl"
          definition={definition}
        />

        <section className="mx-auto mt-7 grid min-w-0 max-w-2xl gap-4">
          <AllowlistNotice status={allowlistStatus} />
          <ActionVariableForm
            allowlistStatus={allowlistStatus}
            rawValues={rawValues}
            className="border-secondary/30 shadow-xl shadow-secondary/10"
            definition={definition}
            setRawValues={setRawValues}
            variables={variables}
          />
        </section>

        <section className="mx-auto mt-7 min-w-0 max-w-2xl">
          <TechnicalDetailsPanel
            rawValues={rawValues}
            definition={definition}
            presentation="accordion"
          />
        </section>
      </div>
    </main>
  );
}

function ActionHero({
  align = "left",
  className,
  definition,
}: {
  align?: "center" | "left";
  className?: string;
  definition: ActionDefinitionV1;
}) {
  return (
    <header
      className={classNames(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <div>
        <h1 className="text-3xl font-semibold text-neutral md:text-5xl">
          {definition.title}
        </h1>
        {definition.description ? (
          <p
            className={classNames(
              "mt-3 text-base leading-7 text-base-content/70 md:text-lg",
              align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl",
            )}
          >
            {definition.description}
          </p>
        ) : null}
      </div>
      <ActionMetaStrip definition={definition} />
    </header>
  );
}

function ActionMetaStrip({
  className,
  definition,
}: {
  className?: string;
  definition: ActionDefinitionV1;
}) {
  const chain = getChainConfig(definition.chainId);
  const creatorNft = definition.commissionRoadNftId
    ? {
        id: definition.commissionRoadNftId,
        name: `NFT #${definition.commissionRoadNftId}`,
      }
    : undefined;

  return (
    <dl
      className={classNames(
        "flex min-w-0 flex-wrap items-center justify-center gap-x-12 gap-y-3",
        className,
      )}
    >
      <MetaTile
        label="Chain"
        value={
          <span className="inline-flex min-w-0 items-center gap-2">
            <img
              alt=""
              aria-hidden="true"
              className="size-5 shrink-0"
              src={getChainIconSrc(definition.chainId)}
            />
            <span className="truncate">{chain.displayName}</span>
          </span>
        }
      />
      <MetaTile
        label="Creator"
        value={
          creatorNft ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              <CommissionRoadNftThumbnail
                chainId={definition.chainId}
                className="size-8 rounded-full"
                framed={false}
                nft={creatorNft}
              />
              <span className="truncate">NFT #{creatorNft.id}</span>
            </span>
          ) : (
            "Selected by creator"
          )
        }
      />
      <MetaTile
        label="Fee"
        value={formatCommission(definition)}
        valueClassName="tabular-nums"
      />
    </dl>
  );
}

function MetaTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 text-sm">
      <dt className="min-w-0 font-medium text-base-content/55">
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={classNames(
          "flex min-w-0 items-center break-words font-semibold leading-6 text-neutral",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function formatCommission(definition: ActionDefinitionV1): string {
  if (definition.commissionFormula.kind === "percentage") {
    return `${definition.commissionFormula.bps / 100}%`;
  }

  if (definition.commissionToken.kind === "eth") {
    return `${definition.commissionFormula.amount} ETH`;
  }

  return `${definition.commissionFormula.amount} ${
    definition.commissionToken.symbol ?? "tokens"
  }`;
}

function getChainIconSrc(chainId: ActionDefinitionV1["chainId"]): string {
  if (chainId === 8453) {
    return "/base.svg";
  }

  if (chainId === 11155111) {
    return "/sepolia.svg";
  }

  return "/ethereum.svg";
}

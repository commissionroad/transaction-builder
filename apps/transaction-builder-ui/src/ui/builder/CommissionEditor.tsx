import type { Address } from "@transaction-builder/domain";
import { useEffect } from "react";
import { isAddress } from "viem";
import type { BuilderDraft } from "./builderState";
import { CommissionRoadNftPicker } from "./CommissionRoadNftPicker";
import { useTokenMetadata } from "../token/useTokenMetadata";

export function CommissionEditor({
  draft,
  onChange,
}: {
  draft: BuilderDraft;
  onChange: (draft: BuilderDraft) => void;
}) {
  const percentageVariables = draft.variables.filter((variable) =>
    variable.type.startsWith("uint"),
  );
  const formulaKind = draft.commissionFormula.kind;
  const percentageFormula =
    draft.commissionFormula.kind === "percentage"
      ? draft.commissionFormula
      : undefined;
  const tokenAddress =
    draft.commissionToken.kind === "erc20"
      ? draft.commissionToken.address
      : undefined;
  const tokenMetadata = useTokenMetadata({
    address: tokenAddress,
    chainId: draft.chainId,
  });
  const commissionTokenSymbol =
    draft.commissionToken.kind === "eth"
      ? "ETH"
      : draft.commissionToken.symbol || "token";
  const updateErc20Token = (
    patch: Partial<Extract<BuilderDraft["commissionToken"], { kind: "erc20" }>>,
  ) => {
    if (draft.commissionToken.kind !== "erc20") {
      return;
    }

    onChange({
      ...draft,
      commissionToken: {
        ...draft.commissionToken,
        ...patch,
      },
    });
  };

  useEffect(() => {
    if (
      draft.commissionToken.kind !== "erc20" ||
      !tokenMetadata.metadata ||
      tokenMetadata.metadata.address !== draft.commissionToken.address
    ) {
      return;
    }

    const nextToken = {
      ...draft.commissionToken,
      symbol: tokenMetadata.metadata.symbol ?? draft.commissionToken.symbol,
      decimals:
        tokenMetadata.metadata.decimals ?? draft.commissionToken.decimals,
    };

    if (
      nextToken.symbol === draft.commissionToken.symbol &&
      nextToken.decimals === draft.commissionToken.decimals
    ) {
      return;
    }

    onChange({ ...draft, commissionToken: nextToken });
  }, [draft, onChange, tokenMetadata.metadata]);

  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-4">
        <h2 className="text-lg font-semibold">Commission</h2>
        <CommissionRoadNftPicker draft={draft} onChange={onChange} />

        <div>
          <div className="mb-2 text-sm font-medium">Commission token</div>
          <div className="daisy-join w-full">
            <button
              className={`daisy-btn daisy-join-item flex-1 ${
                draft.commissionToken.kind === "eth" ? "daisy-btn-active" : ""
              }`}
              onClick={() =>
                onChange({
                  ...draft,
                  commissionToken: { kind: "eth" },
                })
              }
              type="button"
            >
              ETH
            </button>
            <button
              className={`daisy-btn daisy-join-item flex-1 ${
                draft.commissionToken.kind === "erc20" ? "daisy-btn-active" : ""
              }`}
              onClick={() =>
                onChange({
                  ...draft,
                  commissionToken: {
                    kind: "erc20",
                    address:
                      draft.commissionToken.kind === "erc20"
                        ? draft.commissionToken.address
                        : ("" as Address),
                  },
                })
              }
              type="button"
            >
              ERC20
            </button>
          </div>
          {draft.commissionToken.kind === "erc20" ? (
            <div className="mt-3 grid gap-3 rounded-lg bg-base-200 p-3">
              <label className="daisy-form-control">
                <span className="daisy-label pb-2">
                  <span className="daisy-label-text font-medium">
                    ERC20 token address
                  </span>
                </span>
                <input
                  aria-label="ERC20 token address"
                  className="daisy-input daisy-input-bordered w-full font-mono text-sm"
                  placeholder="0x..."
                  value={draft.commissionToken.address}
                  onChange={(event) =>
                    updateErc20Token({ address: event.target.value as Address })
                  }
                />
              </label>

              {draft.commissionToken.address &&
              !isAddress(draft.commissionToken.address) ? (
                <div className="text-xs text-warning">
                  Enter a valid ERC20 token address.
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                <label className="daisy-form-control">
                  <span className="daisy-label pb-2">
                    <span className="daisy-label-text font-medium">Symbol</span>
                  </span>
                  <input
                    aria-label="ERC20 token symbol"
                    className="daisy-input daisy-input-bordered w-full"
                    placeholder="USDC"
                    value={draft.commissionToken.symbol ?? ""}
                    onChange={(event) =>
                      updateErc20Token({
                        symbol: event.target.value || undefined,
                      })
                    }
                  />
                </label>
                <label className="daisy-form-control">
                  <span className="daisy-label pb-2">
                    <span className="daisy-label-text font-medium">
                      Decimals
                    </span>
                  </span>
                  <input
                    aria-label="ERC20 token decimals"
                    className="daisy-input daisy-input-bordered w-full"
                    min={0}
                    type="number"
                    value={draft.commissionToken.decimals ?? ""}
                    onChange={(event) =>
                      updateErc20Token({
                        decimals: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      })
                    }
                  />
                </label>
              </div>

              {tokenMetadata.isLoading ? (
                <div className="text-xs text-base-content/60">
                  Reading token metadata...
                </div>
              ) : tokenMetadata.metadata?.name ? (
                <div className="text-xs text-base-content/60">
                  Resolved {tokenMetadata.metadata.name}
                  {tokenMetadata.metadata.symbol
                    ? ` (${tokenMetadata.metadata.symbol})`
                    : ""}
                  .
                </div>
              ) : draft.commissionToken.address &&
                isAddress(draft.commissionToken.address) ? (
                <div className="text-xs text-base-content/60">
                  If metadata cannot be read, enter the symbol and decimals
                  manually.
                </div>
              ) : null}

              <div className="rounded-lg border border-info/30 bg-info/10 p-3 text-xs text-base-content/70">
                Permit2 Funding is added automatically. Users approve Permit2 if
                needed, sign an exact-amount authorization, then execute the
                Action.
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Fee mode</div>
          <div className="daisy-join w-full">
            <button
              className={`daisy-btn daisy-join-item flex-1 ${formulaKind === "flat" ? "daisy-btn-active" : ""}`}
              onClick={() =>
                onChange({
                  ...draft,
                  commissionFormula: { kind: "flat", amount: "0" },
                })
              }
              type="button"
            >
              Flat
            </button>
            <button
              className={`daisy-btn daisy-join-item flex-1 ${formulaKind === "percentage" ? "daisy-btn-active" : ""}`}
              disabled={!percentageVariables.length}
              onClick={() =>
                onChange({
                  ...draft,
                  commissionFormula: {
                    kind: "percentage",
                    bps: 1,
                    variable: percentageVariables[0]?.name ?? "",
                  },
                })
              }
              type="button"
            >
              Percentage
            </button>
          </div>
        </div>

        {draft.commissionFormula.kind === "flat" ? (
          <label className="daisy-form-control">
            <span className="daisy-label pb-2">
              <span className="daisy-label-text font-medium">
                Flat fee in {commissionTokenSymbol}
              </span>
            </span>
            <input
              className="daisy-input daisy-input-bordered w-full font-mono"
              aria-label={`Flat fee in ${commissionTokenSymbol}`}
              value={draft.commissionFormula.amount}
              onChange={(event) =>
                onChange({
                  ...draft,
                  commissionFormula: {
                    kind: "flat",
                    amount: event.target.value,
                  },
                })
              }
            />
          </label>
        ) : percentageFormula ? (
          <div className="grid gap-3">
            <label className="daisy-form-control">
              <span className="daisy-label pb-2">
                <span className="daisy-label-text font-medium">
                  Basis points
                </span>
              </span>
              <input
                className="daisy-input daisy-input-bordered w-full"
                min={1}
                type="number"
                value={percentageFormula.bps}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    commissionFormula: {
                      kind: "percentage",
                      variable: percentageFormula.variable,
                      bps: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="daisy-form-control">
              <span className="daisy-label pb-2">
                <span className="daisy-label-text font-medium">
                  Percentage of Action Variable
                </span>
              </span>
              <select
                className="daisy-select daisy-select-bordered w-full"
                value={percentageFormula.variable}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    commissionFormula: {
                      kind: "percentage",
                      bps: percentageFormula.bps,
                      variable: event.target.value,
                    },
                  })
                }
              >
                {percentageVariables.map((variable) => (
                  <option key={variable.name} value={variable.name}>
                    {variable.label} ({variable.name})
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}

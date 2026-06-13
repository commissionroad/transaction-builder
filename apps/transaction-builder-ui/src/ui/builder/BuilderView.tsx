import {
  SUPPORTED_CHAIN_IDS,
  getChainConfig,
} from "@transaction-builder/commissionroad-protocol";
import { validateDraft } from "@transaction-builder/domain";
import { Plus, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  createInitialBuilderDraft,
  getDraftStepCount,
  type BuilderDraft,
} from "./builderState";

export function BuilderView() {
  const [draft, setDraft] = useState<BuilderDraft>(() =>
    createInitialBuilderDraft(),
  );
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const canShare = validation.success && getDraftStepCount(draft) > 0;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-secondary">
            Action Builder
          </p>
          <h1 className="text-3xl font-semibold text-neutral md:text-4xl">
            Build a shareable CommissionRoad Action
          </h1>
        </div>

        <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
          <div className="daisy-card-body gap-5">
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="daisy-form-control">
                <span className="daisy-label pb-2">
                  <span className="daisy-label-text font-medium">
                    Action Chain
                  </span>
                </span>
                <select
                  aria-label="Action Chain"
                  className="daisy-select daisy-select-bordered w-full"
                  value={draft.chainId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      chainId: Number(
                        event.target.value,
                      ) as BuilderDraft["chainId"],
                      commissionRoadNftId: undefined,
                    }))
                  }
                >
                  {SUPPORTED_CHAIN_IDS.map((chainId) => {
                    const chain = getChainConfig(chainId);
                    return (
                      <option key={chainId} value={chainId}>
                        {chain.displayName}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="daisy-form-control">
                <span className="daisy-label pb-2">
                  <span className="daisy-label-text font-medium">
                    Action name
                  </span>
                </span>
                <input
                  aria-label="Action name"
                  className="daisy-input daisy-input-bordered w-full"
                  placeholder="Stake ETH into Lido"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label className="daisy-form-control">
              <span className="daisy-label pb-2">
                <span className="daisy-label-text font-medium">
                  Description
                </span>
              </span>
              <textarea
                aria-label="Description"
                className="daisy-textarea daisy-textarea-bordered min-h-24 w-full"
                placeholder="Describe what this Action does for the person opening the share link."
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </section>

        <section
          className="daisy-card border border-base-300 bg-base-100 shadow-sm"
          aria-labelledby="action-steps-heading"
        >
          <div className="daisy-card-body gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="action-steps-heading" className="text-xl font-semibold">
                  Action Steps
                </h2>
                <p className="text-sm text-base-content/70">
                  Add Contract calls in the order users will execute them.
                </p>
              </div>
              <button className="daisy-btn daisy-btn-secondary" type="button">
                <Plus className="size-4" />
                Add Contract
              </button>
            </div>

            <div className="rounded-lg border border-dashed border-base-300 bg-base-200 px-4 py-10 text-center">
              <p className="font-medium">No Action Steps yet</p>
              <p className="mt-1 text-sm text-base-content/70">
                Start by adding a contract, resolving its ABI, and choosing a
                method.
              </p>
            </div>
          </div>
        </section>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
          <div className="daisy-card-body gap-4">
            <h2 className="text-lg font-semibold">Commission</h2>
            <label className="daisy-form-control">
              <span className="daisy-label pb-2">
                <span className="daisy-label-text font-medium">
                  CommissionRoad NFT
                </span>
              </span>
              <select
                aria-label="CommissionRoad NFT"
                className="daisy-select daisy-select-bordered w-full"
                value={draft.commissionRoadNftId ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    commissionRoadNftId: event.target.value || undefined,
                  }))
                }
              >
                <option value="">Connect wallet to select</option>
              </select>
            </label>
            <div className="rounded-lg bg-base-200 p-3 text-sm text-base-content/70">
              ETH commissions are available now. ERC20 commissions will be
              enabled in the Permit2 funding slice.
            </div>
          </div>
        </section>

        <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
          <div className="daisy-card-body gap-4">
            <h2 className="text-lg font-semibold">Share</h2>
            <p className="text-sm text-base-content/70">
              Share Action creates an immutable Published Action and returns a
              short `/t/` link.
            </p>
            <button
              className="daisy-btn daisy-btn-primary w-full"
              disabled={!canShare}
              type="button"
            >
              <Share2 className="size-4" />
              Share Action
            </button>
          </div>
        </section>
      </aside>
    </main>
  );
}

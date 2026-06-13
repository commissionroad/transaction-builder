import {
  SUPPORTED_CHAIN_IDS,
  getChainConfig,
} from "@transaction-builder/commissionroad-protocol";
import { validateDraft } from "@transaction-builder/domain";
import { useMemo, useState } from "react";
import { AllowlistNotice } from "src/ui/allowlist/AllowlistNotice";
import { useAllowlistStatus } from "src/ui/allowlist/useAllowlistStatus";
import { ActionStepsEditor } from "./ActionStepsEditor";
import { ActionVariableEditor } from "./ActionVariableEditor";
import { CommissionEditor } from "./CommissionEditor";
import { ShareActionPanel } from "./ShareActionPanel";
import { SnippetPanel } from "./SnippetPanel";
import {
  createInitialBuilderDraft,
  getDraftStepCount,
  type BuilderDraft,
} from "./builderState";

export function BuilderView({
  initialDraft,
}: {
  initialDraft?: BuilderDraft;
} = {}) {
  const [draft, setDraft] = useState<BuilderDraft>(
    () => initialDraft ?? createInitialBuilderDraft(),
  );
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const hasActionSteps = useMemo(() => getDraftStepCount(draft) > 0, [draft]);
  const allowlistStatus = useAllowlistStatus(
    validation.success ? validation.definition : undefined,
  );

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
            </div>

            <ActionStepsEditor draft={draft} onChange={setDraft} />
          </div>
        </section>

        <SnippetPanel draft={draft} />
      </section>

      <aside className="flex flex-col gap-4">
        <CommissionEditor draft={draft} onChange={setDraft} />
        <ActionVariableEditor draft={draft} onChange={setDraft} />
        <AllowlistNotice status={allowlistStatus} />
        <ShareActionPanel
          allowlistStatus={allowlistStatus}
          draft={draft}
          hasActionSteps={hasActionSteps}
        />
      </aside>
    </main>
  );
}

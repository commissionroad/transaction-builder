import {
  SUPPORTED_CHAIN_IDS,
  getChainConfig,
} from "@transaction-builder/commissionroad-protocol";
import { validateDraft } from "@transaction-builder/domain";
import { ArrowRight, Check, GitBranch } from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AllowlistNotice } from "src/ui/allowlist/AllowlistNotice";
import {
  useAllowlistStatus,
  type AllowlistStatus,
} from "src/ui/allowlist/useAllowlistStatus";
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

type StageId = "basics" | "steps" | "commission" | "review";

const stages: Array<{
  id: StageId;
  label: string;
  description: string;
}> = [
  {
    id: "basics",
    label: "Basics",
    description: "Chain, name, and creator-facing description.",
  },
  {
    id: "steps",
    label: "Flow",
    description: "Contract calls, read steps, and Variables.",
  },
  {
    id: "commission",
    label: "Commission",
    description: "NFT, token, fee mode, and Permit2 expectations.",
  },
  {
    id: "review",
    label: "Review",
    description: "Snippets, share readiness, and publishing.",
  },
];

export function BuilderView({
  initialDraft,
}: {
  initialDraft?: BuilderDraft;
} = {}) {
  const [draft, setDraft] = useState<BuilderDraft>(
    () => initialDraft ?? createInitialBuilderDraft(),
  );
  const [stage, setStage] = useState<StageId>("basics");
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const hasActionSteps = useMemo(() => getDraftStepCount(draft) > 0, [draft]);
  const allowlistStatus = useAllowlistStatus(
    validation.success ? validation.definition : undefined,
  );
  const currentIndex = getStageIndex(stage);
  const nextStage = stages[currentIndex + 1]?.id;
  const previousStage = stages[currentIndex - 1]?.id;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6">
      <StageStepper draft={draft} setStage={setStage} stage={stage} />

      {stage !== "basics" ? (
        <CompactActionReceipt draft={draft} onEdit={() => setStage("basics")} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <StageWorkSurface
            allowlistStatus={allowlistStatus}
            draft={draft}
            hasActionSteps={hasActionSteps}
            onChange={setDraft}
            stage={stage}
          />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-4">
            <button
              className="daisy-btn daisy-btn-outline"
              disabled={!previousStage}
              onClick={() => previousStage && setStage(previousStage)}
              type="button"
            >
              Back
            </button>
            <button
              className="daisy-btn daisy-btn-secondary"
              disabled={!nextStage}
              onClick={() => nextStage && setStage(nextStage)}
              type="button"
            >
              Continue
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
        <aside className="self-start lg:sticky lg:top-24">
          <ActionPreview draft={draft} />
        </aside>
      </div>
    </main>
  );
}

function StageWorkSurface({
  allowlistStatus,
  draft,
  hasActionSteps,
  onChange,
  stage,
}: {
  allowlistStatus: AllowlistStatus;
  draft: BuilderDraft;
  hasActionSteps: boolean;
  onChange: Dispatch<SetStateAction<BuilderDraft>>;
  stage: StageId;
}) {
  if (stage === "basics") {
    return <BasicsEditor draft={draft} onChange={onChange} />;
  }

  if (stage === "steps") {
    return (
      <div className="grid gap-5">
        <ActionStepsEditor draft={draft} onChange={onChange} />
        {draft.variables.length ? (
          <ActionVariableEditor draft={draft} onChange={onChange} />
        ) : null}
      </div>
    );
  }

  if (stage === "commission") {
    return <CommissionEditor draft={draft} onChange={onChange} />;
  }

  return (
    <div className="grid gap-5">
      <ReviewSummary draft={draft} />
      <AllowlistNotice status={allowlistStatus} />
      <SnippetPanel draft={draft} />
      <ShareActionPanel
        allowlistStatus={allowlistStatus}
        draft={draft}
        hasActionSteps={hasActionSteps}
      />
    </div>
  );
}

function BasicsEditor({
  draft,
  onChange,
}: {
  draft: BuilderDraft;
  onChange: (draft: BuilderDraft) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <label className="daisy-form-control">
          <span className="daisy-label pb-2">
            <span className="daisy-label-text font-medium">Chain</span>
          </span>
          <select
            aria-label="Chain"
            className="daisy-select daisy-select-bordered w-full"
            value={draft.chainId}
            onChange={(event) =>
              onChange({
                ...draft,
                chainId: Number(event.target.value) as BuilderDraft["chainId"],
                commissionRoadNftId: undefined,
              })
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
            <span className="daisy-label-text font-medium">Action name</span>
          </span>
          <input
            aria-label="Action name"
            className="daisy-input daisy-input-bordered w-full"
            placeholder="Stake ETH into Lido"
            value={draft.title}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
          />
        </label>
      </div>

      <label className="daisy-form-control">
        <span className="daisy-label pb-2">
          <span className="daisy-label-text font-medium">Description</span>
        </span>
        <textarea
          aria-label="Description"
          className="daisy-textarea daisy-textarea-bordered min-h-24 w-full"
          placeholder="Describe what this Action does for the person opening the share link."
          value={draft.description}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
        />
      </label>
    </div>
  );
}

function StageStepper({
  draft,
  setStage,
  stage,
}: {
  draft: BuilderDraft;
  setStage: (stage: StageId) => void;
  stage: StageId;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {stages.map((candidate) => (
        <button
          className={`rounded-lg border p-3 text-left transition ${
            candidate.id === stage
              ? "border-secondary bg-secondary text-secondary-content"
              : "border-base-300 bg-base-100 hover:border-secondary"
          }`}
          key={candidate.id}
          onClick={() => setStage(candidate.id)}
          type="button"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{candidate.label}</span>
            {isStageComplete(candidate.id, draft) ? (
              <Check className="size-4" />
            ) : null}
          </div>
          <div className="mt-1 text-xs opacity-70">{candidate.description}</div>
        </button>
      ))}
    </div>
  );
}

function CompactActionReceipt({
  draft,
  onEdit,
}: {
  draft: BuilderDraft;
  onEdit: () => void;
}) {
  const summary = getDraftSummary(draft);

  return (
    <div className="grid gap-3 rounded-lg border border-base-300 bg-base-200 px-4 py-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="truncate font-semibold">
          {draft.title || "Untitled Action"}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
          <span>{summary.chain}</span>
          <span>{summary.steps}</span>
          <span>{summary.commission}</span>
        </div>
      </div>
      <button className="daisy-btn daisy-btn-sm" onClick={onEdit} type="button">
        Edit Basics
      </button>
    </div>
  );
}

function ActionPreview({ draft }: { draft: BuilderDraft }) {
  const contractNodes = getContractCallTree(draft);

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="size-4 text-secondary" />
          Action Preview
        </div>
        <div className="daisy-badge daisy-badge-outline">
          {draft.steps.length}
        </div>
      </div>

      {!contractNodes.length ? (
        <div className="rounded-lg border border-dashed border-base-300 bg-base-200 px-3 py-6 text-center text-sm text-base-content/60">
          Contract calls will appear here.
        </div>
      ) : (
        <div className="grid gap-3">
          {contractNodes.map((node) => (
            <div key={node.contractId}>
              <div className="flex items-start gap-2">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-secondary" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {node.label}
                  </div>
                  <div className="truncate font-mono text-[11px] text-base-content/50">
                    {formatShortAddress(node.address)}
                  </div>
                </div>
              </div>
              <div className="ml-1 mt-2 grid gap-1 border-l border-base-300 pl-4">
                {node.calls.map((call) => (
                  <div
                    className="rounded-md bg-base-200 px-2 py-1.5"
                    key={call.stepId}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
                        Step {call.stepNumber}
                      </span>
                      <span className="text-[10px] uppercase text-base-content/50">
                        {call.kind}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs">
                      {call.signature}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewSummary({ draft }: { draft: BuilderDraft }) {
  const summary = getDraftSummary(draft);

  return (
    <section className="rounded-lg border border-base-300 bg-base-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
        Review
      </div>
      <h2 className="mt-1 text-xl font-semibold">
        {draft.title || "Untitled Action"}
      </h2>
      <p className="mt-1 text-sm text-base-content/70">
        {draft.description || "No description yet."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ReviewPill label="Chain" value={summary.chain} />
        <ReviewPill label="Steps" value={summary.steps} />
        <ReviewPill label="Commission" value={summary.commission} />
        <ReviewPill label="Variables" value={summary.variables} />
      </div>
    </section>
  );
}

function ReviewPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {label}
      </div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

interface DraftSummary {
  chain: string;
  commission: string;
  steps: string;
  variables: string;
}

interface ContractCallTreeNode {
  address: string;
  calls: Array<{
    kind: string;
    signature: string;
    stepId: string;
    stepNumber: number;
  }>;
  contractId: string;
  label: string;
}

function getDraftSummary(draft: BuilderDraft): DraftSummary {
  const chain = getChainConfig(draft.chainId).displayName;
  const commission =
    draft.commissionFormula.kind === "flat"
      ? `Flat ${draft.commissionFormula.amount || "0"} ${draft.commissionToken.kind === "eth" ? "ETH" : draft.commissionToken.symbol || "ERC20"} fee`
      : `${draft.commissionFormula.bps / 100}% of ${draft.commissionFormula.variable}`;

  return {
    chain,
    commission,
    steps:
      draft.steps.length === 1
        ? "1 Action Step"
        : `${draft.steps.length} Action Steps`,
    variables:
      draft.variables.length === 1
        ? "1 Variable"
        : `${draft.variables.length} Variables`,
  };
}

function getContractCallTree(draft: BuilderDraft): ContractCallTreeNode[] {
  const nodes: ContractCallTreeNode[] = [];
  const nodesByContractId = new Map<string, ContractCallTreeNode>();

  draft.steps.forEach((step, index) => {
    const contract = draft.contracts.find(
      (candidate) => candidate.id === step.contractId,
    );
    const contractId = contract?.id ?? step.contractId;
    let node = nodesByContractId.get(contractId);

    if (!node) {
      node = {
        address: contract?.address ?? step.target,
        calls: [],
        contractId,
        label: getContractDisplayName(draft, step.contractId),
      };
      nodesByContractId.set(contractId, node);
      nodes.push(node);
    }

    node.calls.push({
      kind: step.kind,
      signature: step.functionSignature ?? step.functionName,
      stepId: step.id,
      stepNumber: index + 1,
    });
  });

  return nodes;
}

function getContractDisplayName(
  draft: BuilderDraft,
  contractId: string,
): string {
  const contract = draft.contracts.find(
    (candidate) => candidate.id === contractId,
  );

  return (
    contract?.labels.verified ??
    contract?.labels.creator ??
    contract?.address ??
    contractId
  );
}

function formatShortAddress(address: string): string {
  return address.length > 14
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
}

function isStageComplete(stage: StageId, draft: BuilderDraft): boolean {
  if (stage === "basics") {
    return Boolean(draft.title.trim() && draft.description?.trim());
  }

  if (stage === "steps") {
    return draft.steps.length > 0;
  }

  if (stage === "commission") {
    return Boolean(draft.commissionRoadNftId);
  }

  return validateDraft(draft).success;
}

function getStageIndex(stage: StageId): number {
  return Math.max(
    stages.findIndex((candidate) => candidate.id === stage),
    0,
  );
}

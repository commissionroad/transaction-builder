import {
  SUPPORTED_CHAIN_IDS,
  getChainConfig,
} from "@transaction-builder/commissionroad-protocol";
import { validateDraft } from "@transaction-builder/domain";
import classNames from "classnames";
import { ArrowRight, Check, ChevronDown, GitBranch, Info } from "lucide-react";
import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AllowlistNotice } from "src/ui/allowlist/AllowlistNotice";
import {
  useAllowlistStatus,
  type AllowlistStatus,
} from "src/ui/allowlist/useAllowlistStatus";
import { Erc20TokenIdentity } from "src/ui/token/Erc20TokenIdentity";
import { getFixedSweepErc20TokenAddress } from "src/ui/token/sweepToken";
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
  const variableEditorMode =
    currentIndex >= getStageIndex("steps") ? "accordion" : "expanded";

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6">
      <StageStepper draft={draft} setStage={setStage} stage={stage} />

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
            {nextStage ? (
              <button
                className="daisy-btn daisy-btn-secondary"
                onClick={() => setStage(nextStage)}
                type="button"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
        <aside className="grid gap-5 self-start lg:sticky lg:top-24">
          {draft.variables.length ? (
            <section className="grid gap-2">
              <SidebarSectionHeader
                info="Variables are values the person using your share link fills in before executing the Action."
                title="Variables"
              />
              <ActionVariableEditor
                draft={draft}
                mode={variableEditorMode}
                onChange={setDraft}
              />
            </section>
          ) : null}
          <PreviewSection draft={draft} />
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
      </div>
    );
  }

  if (stage === "commission") {
    return <CommissionEditor draft={draft} onChange={onChange} />;
  }

  return (
    <div className="grid gap-5">
      <AllowlistNotice status={allowlistStatus} />
      <ShareActionPanel
        allowlistStatus={allowlistStatus}
        draft={draft}
        hasActionSteps={hasActionSteps}
      />
      <SnippetPanel draft={draft} />
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
        <ChainPicker draft={draft} onChange={onChange} />

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

function ChainPicker({
  draft,
  onChange,
}: {
  draft: BuilderDraft;
  onChange: (draft: BuilderDraft) => void;
}) {
  const selectedChain = getChainConfig(draft.chainId);

  return (
    <div className="daisy-form-control">
      <label className="daisy-label pb-2" id="chain-picker-label">
        <span className="daisy-label-text font-medium">Chain</span>
      </label>
      <details className="daisy-dropdown w-full">
        <summary
          aria-labelledby="chain-picker-label chain-picker-value"
          className="flex h-10 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-base-300 bg-base-100 px-3 text-base font-normal text-base-content transition hover:border-base-content/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChainLogo chainId={draft.chainId} />
            <span className="truncate" id="chain-picker-value">
              {selectedChain.displayName}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        </summary>
        <ul className="daisy-menu daisy-dropdown-content z-20 mt-2 w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          {SUPPORTED_CHAIN_IDS.map((chainId) => {
            const chain = getChainConfig(chainId);
            const isSelected = chainId === draft.chainId;

            return (
              <li key={chainId}>
                <button
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_1rem] items-center gap-3"
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    onChange({
                      ...draft,
                      chainId,
                      commissionRoadNftId: undefined,
                    });
                  }}
                  type="button"
                >
                  <ChainLogo chainId={chainId} />
                  <span className="truncate text-left">
                    {chain.displayName}
                  </span>
                  {isSelected ? (
                    <Check className="size-4 text-secondary" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}

function ChainLogo({ chainId }: { chainId: BuilderDraft["chainId"] }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className="size-6 rounded-full"
      src={getChainLogoSrc(chainId)}
    />
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
  const currentIndex = getStageIndex(stage);

  return (
    <nav aria-label="Build steps" className="w-full overflow-x-auto pb-1">
      <ol className="flex min-w-[34rem] items-start">
        {stages.flatMap((candidate, index) => {
          const stepNumber = index + 1;
          const isActive = candidate.id === stage;
          const isCompleted = isStageComplete(candidate.id, draft);

          const step = (
            <li
              className="flex min-w-[6rem] flex-col items-center"
              key={candidate.id}
            >
              <button
                aria-current={isActive ? "step" : undefined}
                aria-label={`${candidate.label}: ${candidate.description}`}
                className="group flex flex-col items-center text-center"
                onClick={() => setStage(candidate.id)}
                type="button"
              >
                <span
                  className={classNames(
                    "flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                    {
                      "border-primary bg-primary text-primary-content":
                        isActive || isCompleted,
                      "border-base-300 bg-base-100 text-base-content/40 group-hover:border-primary group-hover:text-primary":
                        !isActive && !isCompleted,
                    },
                  )}
                  data-active={isActive ? "true" : undefined}
                  data-completed={isCompleted ? "true" : undefined}
                  data-step={stepNumber}
                >
                  {isCompleted && !isActive ? (
                    <Check className="size-4 stroke-[3]" aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-bold">{stepNumber}</span>
                  )}
                </span>
                <span
                  className={classNames(
                    "mt-1 whitespace-nowrap text-xs font-semibold transition-opacity",
                    {
                      "text-base-content": isActive || isCompleted,
                      "text-base-content/40 group-hover:text-base-content/70":
                        !isActive && !isCompleted,
                    },
                  )}
                >
                  {candidate.label}
                </span>
              </button>
            </li>
          );

          if (index >= stages.length - 1) {
            return [step];
          }

          const line = (
            <li
              aria-hidden="true"
              className="relative mt-4 h-0.5 flex-1 overflow-hidden bg-base-300"
              key={`${candidate.id}-line`}
            >
              <span
                className={classNames(
                  "absolute inset-y-0 left-0 bg-primary transition-all duration-300",
                  currentIndex > index || isCompleted ? "w-full" : "w-0",
                )}
              />
            </li>
          );

          return [step, line];
        })}
      </ol>
    </nav>
  );
}

function PreviewSection({ draft }: { draft: BuilderDraft }) {
  return (
    <section className="grid gap-2">
      <SidebarSectionHeader
        icon={<GitBranch className="size-4 text-secondary" />}
        title="Preview"
      />
      <PreviewCard draft={draft} />
    </section>
  );
}

function SidebarSectionHeader({
  icon,
  info,
  title,
}: {
  icon?: ReactNode;
  info?: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h3>
      {info ? (
        <span
          aria-label={info}
          className="daisy-tooltip daisy-tooltip-left"
          data-tip={info}
          tabIndex={0}
        >
          <Info className="size-4 text-base-content/50" />
        </span>
      ) : null}
    </div>
  );
}

function PreviewCard({ draft }: { draft: BuilderDraft }) {
  const summary = getDraftSummary(draft);
  const previewSteps = getActionPreviewSteps(draft);

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="border-b border-base-300 pb-3">
        <div className="truncate text-lg font-semibold">
          {draft.title || "Untitled Action"}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
          <span>{summary.chain}</span>
          <span>{summary.steps}</span>
          <span>{summary.commission}</span>
        </div>
      </div>

      {!previewSteps.length ? (
        <div className="mt-3 rounded-lg border border-dashed border-base-300 bg-base-200 px-3 py-6 text-center text-sm text-base-content/60">
          Contract calls will appear here.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {previewSteps.map((step) => (
            <div className="flex items-start gap-2" key={step.stepId}>
              <span className="mt-3 size-2 shrink-0 rounded-full bg-secondary" />
              <div className="min-w-0 flex-1">
                <div className="rounded-md bg-base-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
                      Step {step.stepNumber}
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-base-content/50">
                      {formatStepKind(step.kind)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs">
                    {step.signature}
                  </div>
                  {step.sweepTokenAddress ? (
                    <Erc20TokenIdentity
                      address={step.sweepTokenAddress}
                      chainId={draft.chainId}
                      className="mt-2"
                      label="Token"
                    />
                  ) : null}
                  <div className="mt-2 border-t border-base-300 pt-2">
                    <div className="truncate text-xs font-semibold">
                      {step.contractLabel}
                    </div>
                    <div className="truncate font-mono text-[11px] text-base-content/50">
                      {formatShortAddress(step.address)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface DraftSummary {
  chain: string;
  commission: string;
  steps: string;
}

interface ActionPreviewStep {
  address: string;
  contractLabel: string;
  kind: string;
  signature: string;
  stepId: string;
  stepNumber: number;
  sweepTokenAddress?: string;
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
    steps: draft.steps.length === 1 ? "1 Step" : `${draft.steps.length} Steps`,
  };
}

function getChainLogoSrc(chainId: BuilderDraft["chainId"]): string {
  if (chainId === 8453) {
    return "/base.svg";
  }

  if (chainId === 11155111) {
    return "/sepolia.svg";
  }

  return "/ethereum.svg";
}

function getActionPreviewSteps(draft: BuilderDraft): ActionPreviewStep[] {
  return draft.steps.map((step, index) => {
    const contract = draft.contracts.find(
      (candidate) => candidate.id === step.contractId,
    );

    return {
      address: contract?.address ?? step.target,
      contractLabel: getContractDisplayName(draft, step.contractId),
      kind: step.kind,
      signature: step.functionSignature ?? step.functionName,
      stepId: step.id,
      stepNumber: index + 1,
      sweepTokenAddress: getFixedSweepErc20TokenAddress(step),
    };
  });
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

function formatStepKind(kind: string): string {
  if (kind === "sweepErc20") return "Sweep ERC20";
  if (kind === "sweepErc1155") return "Sweep ERC1155";
  return kind;
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

  return false;
}

function getStageIndex(stage: StageId): number {
  return Math.max(
    stages.findIndex((candidate) => candidate.id === stage),
    0,
  );
}

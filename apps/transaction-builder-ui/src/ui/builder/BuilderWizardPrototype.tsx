import {
  SUPPORTED_CHAIN_IDS,
  getChainConfig,
} from "@transaction-builder/commissionroad-protocol";
import { validateDraft } from "@transaction-builder/domain";
import {
  ArrowRight,
  Check,
  Circle,
  FileCode2,
  GitBranch,
  ListChecks,
  PanelRight,
  Route,
  Settings2,
  Sparkles,
} from "lucide-react";
import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  PrototypeSwitcher,
  type PrototypeVariant,
} from "src/ui/prototype/PrototypeSwitcher";
import { ActionStepsEditor } from "./ActionStepsEditor";
import { ActionVariableEditor } from "./ActionVariableEditor";
import { CommissionEditor } from "./CommissionEditor";
import { SnippetPanel } from "./SnippetPanel";
import { createInitialBuilderDraft, type BuilderDraft } from "./builderState";

// PROTOTYPE - Three variants of a multi-step builder, switchable via ?prototype=wizard&variant=, on the existing / route.

type VariantKey = "A" | "B" | "C";
type StageId = "basics" | "steps" | "commission" | "review";

const variants: PrototypeVariant[] = [
  { key: "A", name: "Focused wizard" },
  { key: "B", name: "Command center" },
  { key: "C", name: "Checklist workbench" },
];

const stages: Array<{
  id: StageId;
  label: string;
  description: string;
}> = [
  {
    id: "basics",
    label: "Action",
    description: "Chain, name, and creator-facing description.",
  },
  {
    id: "steps",
    label: "Flow",
    description: "Contract calls, read steps, and Action Variables.",
  },
  {
    id: "commission",
    label: "Commission",
    description: "NFT, token, fee mode, and Permit2 expectations.",
  },
  {
    id: "review",
    label: "Review",
    description: "Snippets, share readiness, and state inspection.",
  },
];

export function BuilderWizardPrototype() {
  const [draft, setDraft] = useState<BuilderDraft>(() => {
    const initialDraft = createInitialBuilderDraft();
    return {
      ...initialDraft,
      title: "Stake ETH into Lido",
      description:
        "Let a user stake ETH into Lido and pay a transparent app fee.",
    };
  });
  const [stage, setStage] = useState<StageId>("basics");
  const [variant, setVariant] = useState<VariantKey>(getInitialVariant);

  const updateVariant = (nextVariant: string) => {
    const safeVariant = toVariantKey(nextVariant);
    setVariant(safeVariant);
    const url = new URL(window.location.href);
    url.searchParams.set("prototype", "wizard");
    url.searchParams.set("variant", safeVariant);
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      {variant === "A" ? (
        <VariantA
          draft={draft}
          onChange={setDraft}
          setStage={setStage}
          stage={stage}
        />
      ) : variant === "B" ? (
        <VariantB
          draft={draft}
          onChange={setDraft}
          setStage={setStage}
          stage={stage}
        />
      ) : (
        <VariantC
          draft={draft}
          onChange={setDraft}
          setStage={setStage}
          stage={stage}
        />
      )}
      <PrototypeSwitcher
        current={variant}
        onChange={updateVariant}
        variants={variants}
      />
    </>
  );
}

function VariantA({ draft, onChange, setStage, stage }: VariantProps) {
  const summary = getDraftSummary(draft);
  const currentIndex = getStageIndex(stage);
  const nextStage = stages[currentIndex + 1]?.id;
  const previousStage = stages[currentIndex - 1]?.id;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8 pb-28">
      <PrototypeHeader
        eyebrow="Prototype A"
        title="Focused wizard"
        description="One decision surface at a time. Completed basics collapse into a small receipt so they stop consuming the top of the page."
      />

      <section className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 px-5 py-4">
          <StageStepper stage={stage} setStage={setStage} summary={summary} />
        </div>
        {stage !== "basics" ? (
          <CompactActionReceipt
            draft={draft}
            onEdit={() => setStage("basics")}
          />
        ) : null}
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <StageWorkSurface
              draft={draft}
              onChange={onChange}
              stage={stage}
              variant="A"
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
            <CompactCallTree draft={draft} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function VariantB({ draft, onChange, setStage, stage }: VariantProps) {
  const summary = getDraftSummary(draft);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 pb-28">
      <PrototypeHeader
        eyebrow="Prototype B"
        title="Command center"
        description="The Action identity becomes a compact header. Work moves through a phase bar with readiness and state always visible on the right."
      />

      <section className="grid gap-4 rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-4 rounded-lg border border-base-300 bg-base-200 p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {summary.chain}
                </div>
                <h2 className="text-2xl font-semibold">
                  {draft.title || "Untitled Action"}
                </h2>
                <p className="mt-1 text-sm text-base-content/70">
                  {draft.description || "No description yet."}
                </p>
              </div>
              <button
                className="daisy-btn daisy-btn-outline daisy-btn-sm"
                onClick={() => setStage("basics")}
                type="button"
              >
                Edit Action Info
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-2 md:grid-cols-4">
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
                <div className="text-sm font-semibold">{candidate.label}</div>
                <div className="mt-1 line-clamp-2 text-xs opacity-70">
                  {candidate.description}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-base-300 bg-base-100 p-4">
            <StageWorkSurface
              draft={draft}
              onChange={onChange}
              stage={stage}
              variant="B"
            />
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <ReadinessCard draft={draft} />
          <MiniMap summary={summary} />
          <DraftStatePanel draft={draft} compact />
        </aside>
      </section>
    </main>
  );
}

function VariantC({ draft, onChange, setStage, stage }: VariantProps) {
  const summary = getDraftSummary(draft);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 pb-28 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="grid content-start gap-4">
        <PrototypeHeader
          eyebrow="Prototype C"
          title="Checklist workbench"
          description="A persistent checklist owns navigation while the active work area stays focused."
          compact
        />
        <section className="rounded-lg border border-base-300 bg-neutral p-4 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Action receipt
          </div>
          <div className="mt-2 text-lg font-semibold">
            {draft.title || "Untitled Action"}
          </div>
          <div className="mt-1 text-sm text-white/70">{summary.chain}</div>
          <div className="mt-3 grid gap-2 text-xs text-white/70">
            <span>{summary.steps}</span>
            <span>{summary.variables}</span>
            <span>{summary.commission}</span>
          </div>
        </section>
        <section className="rounded-lg border border-base-300 bg-base-100 p-3 shadow-sm">
          <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">
            Build checklist
          </div>
          <div className="grid gap-1">
            {stages.map((candidate) => (
              <button
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                  candidate.id === stage
                    ? "bg-success text-neutral"
                    : "hover:bg-base-200"
                }`}
                key={candidate.id}
                onClick={() => setStage(candidate.id)}
                type="button"
              >
                {isStageComplete(candidate.id, draft) ? (
                  <Check className="size-4 text-secondary" />
                ) : (
                  <Circle className="size-4 text-base-content/40" />
                )}
                <span>{candidate.label}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="min-w-0 rounded-lg border border-base-300 bg-base-100 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-base-300 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
              Current workspace
            </div>
            <h2 className="text-2xl font-semibold">
              {stages.find((candidate) => candidate.id === stage)?.label}
            </h2>
          </div>
          <div className="daisy-badge daisy-badge-outline">
            {getStageIndex(stage) + 1} of {stages.length}
          </div>
        </div>
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <StageWorkSurface
              draft={draft}
              onChange={onChange}
              stage={stage}
              variant="C"
            />
          </div>
          <aside className="grid content-start gap-4">
            <ReadinessCard draft={draft} />
            <DraftStatePanel draft={draft} compact />
          </aside>
        </div>
      </section>
    </main>
  );
}

function StageWorkSurface({
  draft,
  onChange,
  stage,
  variant,
}: {
  draft: BuilderDraft;
  onChange: Dispatch<SetStateAction<BuilderDraft>>;
  stage: StageId;
  variant: VariantKey;
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
      <SnippetPanel draft={draft} />
      {variant !== "A" ? <DraftStatePanel draft={draft} /> : null}
    </div>
  );
}

function CompactCallTree({ draft }: { draft: BuilderDraft }) {
  const contractNodes = getContractCallTree(draft);

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="size-4 text-secondary" />
          Call Tree
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
            <span className="daisy-label-text font-medium">Action Chain</span>
          </span>
          <select
            aria-label="Action Chain"
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

function PrototypeHeader({
  compact = false,
  description,
  eyebrow,
  title,
}: {
  compact?: boolean;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className={compact ? "grid gap-1" : "grid gap-2"}>
      <div className="text-sm font-semibold uppercase tracking-wide text-secondary">
        {eyebrow}
      </div>
      <h1
        className={
          compact ? "text-2xl font-semibold" : "text-3xl font-semibold"
        }
      >
        {title}
      </h1>
      <p className="max-w-3xl text-sm text-base-content/70">{description}</p>
    </header>
  );
}

function StageStepper({
  setStage,
  stage,
  summary,
}: {
  setStage: (stage: StageId) => void;
  stage: StageId;
  summary: DraftSummary;
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
            {isSummaryStageComplete(candidate.id, summary) ? (
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
    <div className="grid gap-3 border-b border-base-300 bg-base-200 px-5 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
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

function ReadinessCard({ draft }: { draft: BuilderDraft }) {
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const items = [
    {
      label: "Action info",
      complete: isStageComplete("basics", draft),
    },
    {
      label: "At least one step",
      complete: draft.steps.length > 0,
    },
    {
      label: "Commission NFT",
      complete: Boolean(draft.commissionRoadNftId),
    },
    {
      label: "Valid definition",
      complete: validation.success,
    },
  ];

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="size-4 text-secondary" />
        <h3 className="font-semibold">Readiness</h3>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div className="flex items-center gap-2 text-sm" key={item.label}>
            {item.complete ? (
              <Check className="size-4 text-secondary" />
            ) : (
              <Circle className="size-4 text-base-content/40" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      {!validation.success ? (
        <div className="mt-3 rounded-lg bg-base-200 p-3 text-xs text-base-content/70">
          {validation.issues[0]?.message}
        </div>
      ) : null}
    </section>
  );
}

function MiniMap({ summary }: { summary: DraftSummary }) {
  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Route className="size-4 text-secondary" />
        <h3 className="font-semibold">Action map</h3>
      </div>
      <div className="grid gap-3 text-sm">
        <MapLine icon={<Settings2 className="size-4" />} text={summary.chain} />
        <MapLine
          icon={<PanelRight className="size-4" />}
          text={summary.steps}
        />
        <MapLine
          icon={<Sparkles className="size-4" />}
          text={summary.commission}
        />
        <MapLine
          icon={<FileCode2 className="size-4" />}
          text={summary.variables}
        />
      </div>
    </section>
  );
}

function MapLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-base-200 px-3 py-2">
      <span className="text-secondary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function ReviewSummary({ draft }: { draft: BuilderDraft }) {
  const summary = getDraftSummary(draft);

  return (
    <section className="rounded-lg border border-base-300 bg-base-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
        Review surface
      </div>
      <h3 className="mt-1 text-xl font-semibold">
        {draft.title || "Untitled Action"}
      </h3>
      <p className="mt-1 text-sm text-base-content/70">
        {draft.description || "No description yet."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ReviewPill label="Chain" value={summary.chain} />
        <ReviewPill label="Steps" value={summary.steps} />
        <ReviewPill label="Commission" value={summary.commission} />
        <ReviewPill label="Variables" value={summary.variables} />
      </div>
      <button
        className="daisy-btn daisy-btn-primary mt-4"
        disabled
        type="button"
      >
        Share Action is stubbed in this prototype
      </button>
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

function DraftStatePanel({
  compact = false,
  draft,
}: {
  compact?: boolean;
  draft: BuilderDraft;
}) {
  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold">Prototype State</div>
      <pre
        className={`overflow-auto rounded-lg bg-neutral p-3 text-[11px] leading-relaxed text-white ${
          compact ? "max-h-64" : "max-h-[520px]"
        }`}
      >
        {JSON.stringify(
          {
            title: draft.title,
            chainId: draft.chainId,
            commissionRoadNftId: draft.commissionRoadNftId,
            contracts: draft.contracts.length,
            steps: draft.steps.map((step) => step.functionSignature),
            variables: draft.variables.map((variable) => variable.name),
            commissionToken: draft.commissionToken,
            commissionFormula: draft.commissionFormula,
          },
          null,
          2,
        )}
      </pre>
    </section>
  );
}

interface VariantProps {
  draft: BuilderDraft;
  onChange: Dispatch<SetStateAction<BuilderDraft>>;
  setStage: (stage: StageId) => void;
  stage: StageId;
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
        ? "1 Action Variable"
        : `${draft.variables.length} Action Variables`,
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

function isSummaryStageComplete(
  stage: StageId,
  summary: DraftSummary,
): boolean {
  if (stage === "steps") {
    return !summary.steps.startsWith("0 ");
  }

  if (stage === "review") {
    return false;
  }

  return true;
}

function getStageIndex(stage: StageId): number {
  return Math.max(
    stages.findIndex((candidate) => candidate.id === stage),
    0,
  );
}

function getInitialVariant(): VariantKey {
  if (typeof window === "undefined") {
    return "A";
  }

  return toVariantKey(
    new URLSearchParams(window.location.search).get("variant"),
  );
}

function toVariantKey(value: string | null): VariantKey {
  return value === "B" || value === "C" ? value : "A";
}

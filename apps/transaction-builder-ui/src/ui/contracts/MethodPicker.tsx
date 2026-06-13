import type { ContractSnapshot } from "@transaction-builder/domain";
import { BookOpen, PencilLine, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { AbiFunctionFragment } from "../builder/builderState";
import {
  getAbiFunctions,
  getFunctionSignature,
  isWriteFunction,
} from "../builder/builderState";

export function MethodPicker({
  contract,
  onAddStep,
}: {
  contract: ContractSnapshot;
  onAddStep: (fragment: AbiFunctionFragment) => void;
}) {
  const [filter, setFilter] = useState("");
  const functions = getAbiFunctions(contract.abi);
  const visibleFunctions = useMemo(
    () =>
      functions.filter((fragment) =>
        getFunctionSignature(fragment)
          .toLowerCase()
          .includes(filter.trim().toLowerCase()),
      ),
    [filter, functions],
  );
  const writeFunctions = visibleFunctions.filter(isWriteFunction);
  const readFunctions = visibleFunctions.filter(
    (fragment) => !isWriteFunction(fragment),
  );

  if (!functions.length) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        No callable methods were found in this ABI.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-base-300 bg-base-200 p-3">
      <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div>
          <div className="font-medium">Choose method</div>
          <div className="text-sm text-base-content/60">
            Click a method to add it as this step.
          </div>
        </div>
        <label className="daisy-input daisy-input-bordered flex items-center gap-2 bg-base-100">
          <Search className="size-4 opacity-50" />
          <input
            aria-label="Filter methods"
            className="w-full"
            placeholder="Filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
      </div>

      {visibleFunctions.length ? (
        <div className="grid max-h-96 gap-3 overflow-y-auto pr-1">
          {writeFunctions.length ? (
            <MethodGroup
              fragments={writeFunctions}
              icon={<PencilLine className="size-4" />}
              label="Write"
              onAddStep={onAddStep}
            />
          ) : null}

          {readFunctions.length ? (
            <MethodGroup
              fragments={readFunctions}
              icon={<BookOpen className="size-4" />}
              label="Read"
              onAddStep={onAddStep}
            />
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-base-300 bg-base-100 px-3 py-6 text-center text-sm text-base-content/60">
          No methods match that filter.
        </div>
      )}
    </div>
  );
}

function MethodGroup({
  fragments,
  icon,
  label,
  onAddStep,
}: {
  fragments: AbiFunctionFragment[];
  icon: ReactNode;
  label: string;
  onAddStep: (fragment: AbiFunctionFragment) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {icon}
        {label}
      </div>
      <div className="grid gap-2">
        {fragments.map((fragment) => (
          <MethodButton
            fragment={fragment}
            key={getFunctionSignature(fragment)}
            onAddStep={onAddStep}
          />
        ))}
      </div>
    </section>
  );
}

function MethodButton({
  fragment,
  onAddStep,
}: {
  fragment: AbiFunctionFragment;
  onAddStep: (fragment: AbiFunctionFragment) => void;
}) {
  const signature = getFunctionSignature(fragment);
  const isWrite = isWriteFunction(fragment);

  return (
    <button
      className="grid gap-1 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-left transition hover:border-secondary hover:bg-base-100"
      onClick={() => onAddStep(fragment)}
      type="button"
    >
      <span className="flex flex-wrap items-start justify-between gap-2">
        <span className="break-all font-mono text-sm font-semibold text-base-content">
          {signature}
        </span>
        <span className="daisy-badge daisy-badge-outline daisy-badge-sm">
          {isWrite ? "write" : "read"}
        </span>
      </span>
      <span className="text-xs text-base-content/60">
        {isWrite
          ? `${fragment.stateMutability} · ${formatCount(
              fragment.inputs.length,
              "parameter",
            )}`
          : `Read Step · ${formatCount(fragment.outputs.length, "output")}`}
      </span>
    </button>
  );
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

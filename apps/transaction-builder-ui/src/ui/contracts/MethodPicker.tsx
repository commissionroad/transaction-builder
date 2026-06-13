import type { ContractSnapshot } from "@transaction-builder/domain";
import { BookOpen, ChevronDown, PencilLine, Search } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="grid gap-2">
      <button
        aria-expanded={isOpen}
        className="daisy-btn daisy-btn-outline w-full justify-between"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        Choose method
        <ChevronDown className="size-4" />
      </button>
      {isOpen ? (
        <div className="rounded-lg border border-base-300 bg-base-200 p-2">
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

          {visibleFunctions.length ? (
            <ul className="daisy-menu daisy-menu-sm mt-2 max-h-96 w-full overflow-y-auto rounded-lg bg-base-200 p-0">
              {writeFunctions.length ? (
                <MethodGroup
                  fragments={writeFunctions}
                  icon={<PencilLine className="size-4" />}
                  label="Write"
                  open
                  onAddStep={(fragment) => {
                    onAddStep(fragment);
                    setIsOpen(false);
                  }}
                />
              ) : null}

              {readFunctions.length ? (
                <MethodGroup
                  fragments={readFunctions}
                  icon={<BookOpen className="size-4" />}
                  label="Read"
                  open={!writeFunctions.length}
                  onAddStep={(fragment) => {
                    onAddStep(fragment);
                    setIsOpen(false);
                  }}
                />
              ) : null}
            </ul>
          ) : (
            <div className="mt-2 rounded-lg border border-dashed border-base-300 bg-base-100 px-3 py-6 text-center text-sm text-base-content/60">
              No methods match that filter.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MethodGroup({
  fragments,
  icon,
  label,
  open = false,
  onAddStep,
}: {
  fragments: AbiFunctionFragment[];
  icon: ReactNode;
  label: string;
  open?: boolean;
  onAddStep: (fragment: AbiFunctionFragment) => void;
}) {
  return (
    <li>
      <details open={open}>
        <summary>
          {icon}
          {label}
          <span className="daisy-badge daisy-badge-sm daisy-badge-outline ml-auto">
            {fragments.length}
          </span>
        </summary>
        <ul>
          {fragments.map((fragment) => (
            <MethodButton
              fragment={fragment}
              key={getFunctionSignature(fragment)}
              onAddStep={onAddStep}
            />
          ))}
        </ul>
      </details>
    </li>
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
    <li>
      <button
        className="grid gap-1 py-2 text-left"
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
    </li>
  );
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

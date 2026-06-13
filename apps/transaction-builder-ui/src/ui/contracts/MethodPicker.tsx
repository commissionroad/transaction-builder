import type { ContractSnapshot } from "@transaction-builder/domain";
import { ChevronDown, Search } from "lucide-react";
import { useId, useMemo, useState, type CSSProperties } from "react";
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
  const pickerId = useStablePickerId();
  const popoverId = `method-picker-${pickerId}`;
  const anchorName = `--method-picker-${pickerId}`;
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

  const handleAddStep = (fragment: AbiFunctionFragment) => {
    onAddStep(fragment);
    document.getElementById(popoverId)?.hidePopover?.();
  };

  return (
    <>
      <button
        className="daisy-btn daisy-btn-outline w-full justify-between"
        popoverTarget={popoverId}
        style={{ anchorName } as CSSProperties}
        type="button"
      >
        Choose method
        <ChevronDown className="size-4" />
      </button>
      <ul
        className="daisy-dropdown daisy-menu daisy-menu-sm max-h-96 w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
        id={popoverId}
        popover="auto"
        style={{ positionAnchor: anchorName } as CSSProperties}
      >
        <li className="p-1">
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
        </li>

        {visibleFunctions.length ? (
          <>
            {writeFunctions.length ? (
              <MethodSection
                fragments={writeFunctions}
                label="Write methods"
                onAddStep={handleAddStep}
              />
            ) : null}

            {readFunctions.length ? (
              <MethodSection
                fragments={readFunctions}
                label="Read methods"
                separated={!!writeFunctions.length}
                onAddStep={handleAddStep}
              />
            ) : null}
          </>
        ) : (
          <li className="daisy-menu-disabled">
            <span className="justify-center py-6 text-base-content/60">
              No methods match that filter.
            </span>
          </li>
        )}
      </ul>
    </>
  );
}

function MethodSection({
  fragments,
  label,
  onAddStep,
  separated = false,
}: {
  fragments: AbiFunctionFragment[];
  label: string;
  onAddStep: (fragment: AbiFunctionFragment) => void;
  separated?: boolean;
}) {
  return (
    <>
      <li
        className={`daisy-menu-title ${separated ? "mt-2 border-t border-base-300 pt-3" : "pt-2"}`}
      >
        <span className="flex items-center justify-between gap-2">
          {label}
          <span className="daisy-badge daisy-badge-sm daisy-badge-outline">
            {fragments.length}
          </span>
        </span>
      </li>
      {fragments.map((fragment) => (
        <MethodButton
          fragment={fragment}
          key={getFunctionSignature(fragment)}
          onAddStep={onAddStep}
        />
      ))}
    </>
  );
}

function useStablePickerId(): string {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "");
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

import type { ContractSnapshot } from "@transaction-builder/domain";
import { BookOpen, ChevronDown, PencilLine } from "lucide-react";
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
  const functions = getAbiFunctions(contract.abi);
  const writeFunctions = functions.filter(isWriteFunction);
  const readFunctions = functions.filter(
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
    <div className="daisy-dropdown w-full">
      <button
        className="daisy-btn daisy-btn-outline w-full justify-between"
        type="button"
      >
        <span>Choose Method</span>
        <ChevronDown className="size-4" />
      </button>
      <ul
        className="daisy-menu daisy-dropdown-content z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-base-300 bg-base-100 p-2 shadow-xl"
        tabIndex={0}
      >
        {writeFunctions.length ? (
          <li>
            <details open>
              <summary>
                <PencilLine className="size-4" />
                Write methods
              </summary>
              <ul>
                {writeFunctions.map((fragment) => (
                  <MethodMenuItem
                    fragment={fragment}
                    key={getFunctionSignature(fragment)}
                    onAddStep={onAddStep}
                  />
                ))}
              </ul>
            </details>
          </li>
        ) : null}

        {readFunctions.length ? (
          <li>
            <details open>
              <summary>
                <BookOpen className="size-4" />
                Read methods
              </summary>
              <ul>
                {readFunctions.map((fragment) => (
                  <MethodMenuItem
                    fragment={fragment}
                    key={getFunctionSignature(fragment)}
                    onAddStep={onAddStep}
                  />
                ))}
              </ul>
            </details>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function MethodMenuItem({
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
        className="grid gap-1 py-3 text-left"
        onClick={() => onAddStep(fragment)}
        type="button"
      >
        <span className="break-all font-mono text-sm font-semibold">
          {signature}
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

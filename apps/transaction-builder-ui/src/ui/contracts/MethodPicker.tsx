import type { ContractSnapshot } from "@transaction-builder/domain";
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

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 md:grid-cols-2">
        {writeFunctions.map((fragment) => (
          <button
            className="rounded-lg border border-base-300 bg-base-100 p-3 text-left transition hover:border-secondary hover:bg-base-200"
            key={getFunctionSignature(fragment)}
            onClick={() => onAddStep(fragment)}
            type="button"
          >
            <div className="font-mono text-sm font-semibold">
              {fragment.name}()
            </div>
            <div className="mt-1 text-xs text-base-content/70">
              {fragment.stateMutability} · {fragment.inputs.length} parameter
              {fragment.inputs.length === 1 ? "" : "s"}
            </div>
          </button>
        ))}
      </div>

      {readFunctions.length ? (
        <details className="rounded-lg bg-base-200 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Read methods
          </summary>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {readFunctions.map((fragment) => (
              <button
                className="rounded-lg border border-base-300 bg-base-100 p-3 text-left opacity-60"
                disabled
                key={getFunctionSignature(fragment)}
                type="button"
              >
                <div className="font-mono text-sm font-semibold">
                  {fragment.name}()
                </div>
                <div className="mt-1 text-xs text-base-content/70">
                  Read Steps unlock in the Commission Plan slice.
                </div>
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

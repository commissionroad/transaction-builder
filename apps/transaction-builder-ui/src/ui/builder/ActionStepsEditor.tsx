import type {
  ActionDefinitionV1,
  ActionStep,
  ActionVariable,
  ContractParameterBinding,
  ContractSnapshot,
} from "@transaction-builder/domain";
import { Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { AbiFunctionFragment, BuilderDraft } from "./builderState";
import {
  createActionVariable,
  createStepFromFunction,
  getFunctionSignature,
  updateParameterBinding,
} from "./builderState";
import { ContractAddressInput } from "../contracts/ContractAddressInput";
import { MethodPicker } from "../contracts/MethodPicker";

export function ActionStepsEditor({
  draft,
  onChange,
}: {
  draft: BuilderDraft;
  onChange: Dispatch<SetStateAction<BuilderDraft>>;
}) {
  const addContract = (contract: ContractSnapshot) => {
    onChange((current) => ({
      ...current,
      contracts: [...current.contracts, contract],
    }));
  };

  const addStep = (
    contract: ContractSnapshot,
    functionFragment: AbiFunctionFragment,
  ) => {
    const step = createStepFromFunction({
      contract,
      functionFragment,
      stepIndex: draft.steps.length,
    });
    onChange((current) => ({
      ...current,
      steps: [...current.steps, step],
    }));
  };

  const updateStep = (updatedStep: ActionStep) => {
    onChange((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === updatedStep.id ? updatedStep : step,
      ),
    }));
  };

  const deleteStep = (stepId: string) => {
    onChange((current) => ({
      ...current,
      steps: current.steps.filter((step) => step.id !== stepId),
    }));
  };

  const addVariable = (variable: ActionVariable) => {
    onChange((current) => ({
      ...current,
      variables: [...current.variables, variable],
    }));
    return variable;
  };

  return (
    <div className="flex flex-col gap-5">
      <ContractAddressInput
        chainId={draft.chainId}
        existingContracts={draft.contracts}
        onContractResolved={addContract}
      />

      {draft.contracts.length ? (
        <div className="flex flex-col gap-4">
          {draft.contracts.map((contract) => (
            <section
              className="rounded-lg border border-base-300 bg-base-200 p-4"
              key={contract.id}
            >
              <div className="mb-3">
                <h3 className="font-semibold">
                  {contract.labels.verified ??
                    contract.labels.creator ??
                    contract.address}
                </h3>
                <p className="break-all font-mono text-xs text-base-content/60">
                  {contract.address}
                </p>
              </div>
              <MethodPicker
                contract={contract}
                onAddStep={(fragment) => addStep(contract, fragment)}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-base-300 bg-base-200 px-4 py-10 text-center">
          <p className="font-medium">No Action Steps yet</p>
          <p className="mt-1 text-sm text-base-content/70">
            Start by adding a contract, resolving its ABI, and choosing a
            method.
          </p>
        </div>
      )}

      {draft.steps.length ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Flow</h3>
          {draft.steps.map((step, index) => (
            <StepEditor
              addVariable={addVariable}
              draft={draft}
              index={index}
              key={step.id}
              onDelete={() => deleteStep(step.id)}
              onUpdate={updateStep}
              step={step}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StepEditor({
  addVariable,
  draft,
  index,
  onDelete,
  onUpdate,
  step,
}: {
  addVariable: (variable: ActionVariable) => ActionVariable;
  draft: ActionDefinitionV1;
  index: number;
  onDelete: () => void;
  onUpdate: (step: ActionStep) => void;
  step: ActionStep;
}) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-base-content/50">
            Step {index + 1}
          </div>
          <div className="font-mono text-sm font-semibold">
            {step.functionSignature || getFunctionSignatureFromStep(step)}
          </div>
        </div>
        <button
          aria-label={`Delete ${step.id}`}
          className="daisy-btn daisy-btn-ghost daisy-btn-sm"
          onClick={onDelete}
          type="button"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {step.inputs.map((input, parameterIndex) => (
          <BindingEditor
            binding={step.parameters[parameterIndex]}
            createVariable={(label) =>
              addVariable(
                createActionVariable({
                  existingVariables: draft.variables,
                  preferredName:
                    input.name || `step${index + 1}Param${parameterIndex + 1}`,
                  type: input.type,
                  label,
                }),
              )
            }
            key={`${step.id}-${parameterIndex}`}
            label={input.name || `parameter ${parameterIndex + 1}`}
            onChange={(binding) =>
              onUpdate(
                updateParameterBinding({ step, parameterIndex, binding }),
              )
            }
            type={input.type}
            variables={draft.variables.filter(
              (variable) => variable.type === input.type,
            )}
          />
        ))}

        {step.callValue ? (
          <BindingEditor
            binding={step.callValue}
            createVariable={(label) =>
              addVariable(
                createActionVariable({
                  existingVariables: draft.variables,
                  preferredName: `${step.functionName}Value`,
                  type: "uint256",
                  label,
                  unit: { kind: "eth", symbol: "ETH", decimals: 18 },
                }),
              )
            }
            label="Call Value"
            onChange={(binding) => onUpdate({ ...step, callValue: binding })}
            type="uint256"
            variables={draft.variables.filter(
              (variable) => variable.type === "uint256",
            )}
          />
        ) : null}
      </div>
    </div>
  );
}

function BindingEditor({
  binding,
  createVariable,
  label,
  onChange,
  type,
  variables,
}: {
  binding: ContractParameterBinding | undefined;
  createVariable: (label: string) => ActionVariable;
  label: string;
  onChange: (binding: ContractParameterBinding) => void;
  type: string;
  variables: ActionVariable[];
}) {
  const currentBinding = binding ?? { kind: "fixed", value: "" };
  const isDynamic = currentBinding.kind === "actionVariable";

  const handleDynamicToggle = (checked: boolean) => {
    if (!checked) {
      onChange({ kind: "fixed", value: "" });
      return;
    }

    const variable = createVariable(toLabel(label));
    onChange({ kind: "actionVariable", name: variable.name });
  };

  return (
    <div className="grid gap-2 rounded-lg bg-base-200 p-3 md:grid-cols-[minmax(0,1fr)_160px]">
      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium">
            {label} <span className="font-mono text-xs opacity-60">{type}</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              checked={isDynamic}
              className="daisy-checkbox daisy-checkbox-sm"
              onChange={(event) => handleDynamicToggle(event.target.checked)}
              type="checkbox"
            />
            Action Variable
          </label>
        </div>

        {isDynamic ? (
          <select
            className="daisy-select daisy-select-bordered mt-2 w-full"
            value={currentBinding.name}
            onChange={(event) =>
              onChange({ kind: "actionVariable", name: event.target.value })
            }
          >
            {variables.map((variable) => (
              <option key={variable.name} value={variable.name}>
                {variable.label} ({variable.name})
              </option>
            ))}
          </select>
        ) : (
          <input
            className="daisy-input daisy-input-bordered mt-2 w-full font-mono text-sm"
            value={String(
              currentBinding.kind === "fixed" ? currentBinding.value : "",
            )}
            onChange={(event) =>
              onChange({ kind: "fixed", value: event.target.value })
            }
          />
        )}
      </div>
    </div>
  );
}

function toLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFunctionSignatureFromStep(step: ActionStep): string {
  return `${step.functionName}(${step.inputs.map((input) => input.type).join(",")})`;
}

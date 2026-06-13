import type {
  ActionDefinitionV1,
  ActionStep,
  ActionVariable,
  ContractParameterBinding,
  ContractSnapshot,
} from "@transaction-builder/domain";
import { Plus, Trash2 } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { AbiFunctionFragment, BuilderDraft } from "./builderState";
import {
  createActionVariable,
  createContractId,
  createStepFromFunction,
  getFunctionSignature,
  updateParameterBinding,
} from "./builderState";
import { ContractAddressInput } from "../contracts/ContractAddressInput";

interface AvailableStepOutput {
  stepId: string;
  stepLabel: string;
  outputIndex: number;
  name: string;
  type: string;
}

export function ActionStepsEditor({
  draft,
  onChange,
}: {
  draft: BuilderDraft;
  onChange: Dispatch<SetStateAction<BuilderDraft>>;
}) {
  const [isAddingStep, setIsAddingStep] = useState(false);
  const shouldShowComposer = isAddingStep || !draft.steps.length;

  const addStep = (
    contract: ContractSnapshot,
    functionFragment: AbiFunctionFragment,
  ) => {
    onChange((current) => {
      const existingContract = current.contracts.find(
        (candidate) =>
          candidate.chainId === contract.chainId &&
          candidate.address.toLowerCase() === contract.address.toLowerCase(),
      );
      const stepContract =
        existingContract ??
        ({
          ...contract,
          id: createContractId(current.contracts),
        } satisfies ContractSnapshot);
      const step = createStepFromFunction({
        contract: stepContract,
        functionFragment,
        stepIndex: current.steps.length,
      });

      return {
        ...current,
        contracts: existingContract
          ? current.contracts
          : [...current.contracts, stepContract],
        steps: [...current.steps, step],
      };
    });
    setIsAddingStep(false);
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

      {shouldShowComposer ? (
        <ContractAddressInput
          chainId={draft.chainId}
          existingContracts={draft.contracts}
          onCancel={() => setIsAddingStep(false)}
          onStepSelected={addStep}
          stepNumber={draft.steps.length + 1}
          showCancel={draft.steps.length > 0}
        />
      ) : (
        <button
          className="daisy-btn daisy-btn-outline w-full justify-start border-dashed"
          onClick={() => setIsAddingStep(true)}
          type="button"
        >
          <Plus className="size-4" />
          Add next Action Step
        </button>
      )}
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

      {step.outputs.length ? (
        <div className="mt-4 rounded-lg bg-base-200 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-base-content/50">
            Step Outputs
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {step.outputs.map((output, outputIndex) => (
              <span
                className="rounded-md border border-base-300 bg-base-100 px-2 py-1 font-mono text-xs"
                key={`${step.id}-output-${outputIndex}`}
              >
                {output.name || `output ${outputIndex + 1}`}{" "}
                <span className="text-base-content/50">{output.type}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

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
            stepOutputs={getAvailableStepOutputs(draft, index, input.type)}
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
            stepOutputs={getAvailableStepOutputs(draft, index, "uint256")}
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
  stepOutputs,
  type,
  variables,
}: {
  binding: ContractParameterBinding | undefined;
  createVariable: (label: string) => ActionVariable;
  label: string;
  onChange: (binding: ContractParameterBinding) => void;
  stepOutputs: AvailableStepOutput[];
  type: string;
  variables: ActionVariable[];
}) {
  const currentBinding = binding ?? { kind: "fixed", value: "" };

  const handleModeChange = (mode: ContractParameterBinding["kind"]): void => {
    if (mode === "fixed") {
      onChange({ kind: "fixed", value: "" });
      return;
    }

    if (mode === "actionVariable") {
      if (currentBinding.kind === "actionVariable") {
        return;
      }

      const variable = createVariable(toLabel(label));
      onChange({ kind: "actionVariable", name: variable.name });
      return;
    }

    const output = stepOutputs[0];
    if (!output) {
      return;
    }

    onChange({
      kind: "stepOutput",
      stepId: output.stepId,
      outputIndex: output.outputIndex,
    });
  };

  return (
    <div className="grid gap-3 rounded-lg bg-base-200 p-3">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-medium">
            {label} <span className="font-mono text-xs opacity-60">{type}</span>
          </label>
          <div className="daisy-join">
            <button
              className={`daisy-btn daisy-join-item daisy-btn-xs ${
                currentBinding.kind === "fixed" ? "daisy-btn-active" : ""
              }`}
              onClick={() => handleModeChange("fixed")}
              type="button"
            >
              Fixed
            </button>
            <button
              className={`daisy-btn daisy-join-item daisy-btn-xs ${
                currentBinding.kind === "actionVariable"
                  ? "daisy-btn-active"
                  : ""
              }`}
              onClick={() => handleModeChange("actionVariable")}
              type="button"
            >
              Action Variable
            </button>
            <button
              className={`daisy-btn daisy-join-item daisy-btn-xs ${
                currentBinding.kind === "stepOutput" ? "daisy-btn-active" : ""
              }`}
              disabled={!stepOutputs.length}
              onClick={() => handleModeChange("stepOutput")}
              type="button"
            >
              Step Output
            </button>
          </div>
        </div>

        {currentBinding.kind === "actionVariable" ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              className="daisy-select daisy-select-bordered w-full"
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
            <button
              className="daisy-btn daisy-btn-outline"
              onClick={() => {
                const variable = createVariable(toLabel(label));
                onChange({ kind: "actionVariable", name: variable.name });
              }}
              type="button"
            >
              <Plus className="size-4" />
              New
            </button>
          </div>
        ) : currentBinding.kind === "stepOutput" ? (
          <select
            className="daisy-select daisy-select-bordered mt-2 w-full"
            value={`${currentBinding.stepId}:${currentBinding.outputIndex}`}
            onChange={(event) => {
              const [stepId, outputIndex] = event.target.value.split(":");
              onChange({
                kind: "stepOutput",
                stepId,
                outputIndex: Number(outputIndex),
              });
            }}
          >
            {stepOutputs.map((output) => (
              <option
                key={`${output.stepId}-${output.outputIndex}`}
                value={`${output.stepId}:${output.outputIndex}`}
              >
                {output.stepLabel} · {output.name} ({output.type})
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

function getAvailableStepOutputs(
  draft: ActionDefinitionV1,
  currentStepIndex: number,
  type: string,
): AvailableStepOutput[] {
  return draft.steps
    .slice(0, currentStepIndex)
    .filter((candidate) => candidate.outputs.length === 1)
    .flatMap((candidate, stepIndex) =>
      candidate.outputs.map((output, outputIndex) => ({
        stepId: candidate.id,
        stepLabel:
          candidate.label ||
          candidate.functionSignature ||
          candidate.functionName ||
          `Step ${stepIndex + 1}`,
        outputIndex,
        name: output.name || `output ${outputIndex + 1}`,
        type: output.type,
      })),
    )
    .filter((output) => output.type === type);
}

function toLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFunctionSignatureFromStep(step: ActionStep): string {
  return `${step.functionName}(${step.inputs.map((input) => input.type).join(",")})`;
}

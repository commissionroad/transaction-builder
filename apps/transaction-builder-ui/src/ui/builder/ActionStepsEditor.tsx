import type {
  ActionDefinitionV1,
  ActionStep,
  ActionVariable,
  Address,
  ContractParameterBinding,
  ContractSnapshot,
} from "@transaction-builder/domain";
import {
  commissionRoadAbi,
  getCommissionRoadAddresses,
} from "@transaction-builder/commissionroad-protocol";
import { Plus, Trash2 } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { AbiFunctionFragment, BuilderDraft } from "./builderState";
import {
  createActionVariable,
  createContractId,
  createStepFromFunction,
  getAbiFunctions,
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

type SweepHelperKind = "erc20" | "erc1155";

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

  const addSweepStep = (kind: SweepHelperKind) => {
    onChange((current) => addCommissionRoadSweepStep({ draft: current, kind }));
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
        <StepCreationActions
          onAddContractCall={() => setIsAddingStep(true)}
          onAddSweepErc1155={() => addSweepStep("erc1155")}
          onAddSweepErc20={() => addSweepStep("erc20")}
        />
      )}
    </div>
  );
}

function StepCreationActions({
  onAddContractCall,
  onAddSweepErc1155,
  onAddSweepErc20,
}: {
  onAddContractCall: () => void;
  onAddSweepErc1155: () => void;
  onAddSweepErc20: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-dashed border-base-300 bg-base-100 p-3 sm:grid-cols-3">
      <button
        className="daisy-btn daisy-btn-outline justify-start"
        onClick={onAddContractCall}
        type="button"
      >
        <Plus className="size-4" />
        Add Contract Call
      </button>
      <button
        className="daisy-btn daisy-btn-outline justify-start"
        onClick={onAddSweepErc20}
        type="button"
      >
        <Plus className="size-4" />
        Sweep ERC20
      </button>
      <button
        className="daisy-btn daisy-btn-outline justify-start"
        onClick={onAddSweepErc1155}
        type="button"
      >
        <Plus className="size-4" />
        Sweep ERC1155
      </button>
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
  const contract = draft.contracts.find(
    (candidate) => candidate.id === step.contractId,
  );
  const contractLabel = getContractDisplayName(contract, step.target);

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-base-content/50">
            Step {index + 1}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{contractLabel}</span>
            <span className="font-mono text-xs text-base-content/50">
              {formatShortAddress(step.target)}
            </span>
          </div>
          <div className="mt-1 break-all font-mono text-sm font-semibold">
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

function addCommissionRoadSweepStep({
  draft,
  kind,
}: {
  draft: BuilderDraft;
  kind: SweepHelperKind;
}): BuilderDraft {
  const addresses = getCommissionRoadAddresses(draft.chainId);
  const existingContract = draft.contracts.find(
    (contract) =>
      contract.address.toLowerCase() === addresses.commissionRoad.toLowerCase(),
  );
  const contract =
    existingContract ??
    ({
      id: getAvailableContractId("commissionRoad", draft.contracts),
      chainId: draft.chainId,
      address: addresses.commissionRoad,
      labels: { verified: "CommissionRoad" },
      abi: [...commissionRoadAbi],
      abiSource: { kind: "explorer", explorer: "commissionroad-protocol" },
    } satisfies ContractSnapshot);
  const recipientVariable =
    draft.variables.find(
      (variable) =>
        variable.name === "recipient" && variable.type === "address",
    ) ??
    createActionVariable({
      existingVariables: draft.variables,
      preferredName: "recipient",
      type: "address",
      label: "Recipient",
      description: "Wallet receiving the swept token balance.",
    });
  const fragment = getCommissionRoadFunctionFragment(
    kind === "erc20" ? "sweepERC20Token" : "sweepERC1155Token",
  );
  const defaultToken = getDefaultSweepToken({
    commissionRoadAddress: addresses.commissionRoad,
    draft,
  });
  const step = createStepFromFunction({
    contract,
    functionFragment: fragment,
    stepIndex: draft.steps.length,
  });

  return {
    ...draft,
    contracts: existingContract
      ? draft.contracts
      : [...draft.contracts, contract],
    variables: draft.variables.some(
      (variable) => variable.name === recipientVariable.name,
    )
      ? draft.variables
      : [...draft.variables, recipientVariable],
    steps: [
      ...draft.steps,
      {
        ...step,
        kind: kind === "erc20" ? "sweepErc20" : "sweepErc1155",
        label: kind === "erc20" ? "Sweep ERC20" : "Sweep ERC1155",
        parameters:
          kind === "erc20"
            ? [
                { kind: "fixed", value: defaultToken },
                { kind: "actionVariable", name: recipientVariable.name },
              ]
            : [
                { kind: "fixed", value: defaultToken },
                { kind: "fixed", value: "0" },
                { kind: "actionVariable", name: recipientVariable.name },
              ],
      },
    ],
  };
}

function getCommissionRoadFunctionFragment(
  functionName: "sweepERC20Token" | "sweepERC1155Token",
): AbiFunctionFragment {
  const fragment = getAbiFunctions([...commissionRoadAbi]).find(
    (candidate) => candidate.name === functionName,
  );

  if (!fragment) {
    throw new Error(`${functionName} is missing from the CommissionRoad ABI.`);
  }

  return fragment;
}

function getAvailableContractId(
  preferredId: string,
  contracts: ContractSnapshot[],
): string {
  if (!contracts.some((contract) => contract.id === preferredId)) {
    return preferredId;
  }

  return createContractId(contracts);
}

function getDefaultSweepToken({
  commissionRoadAddress,
  draft,
}: {
  commissionRoadAddress: Address;
  draft: BuilderDraft;
}): Address {
  const previousTarget = [...draft.steps]
    .reverse()
    .find(
      (step) =>
        step.target.toLowerCase() !== commissionRoadAddress.toLowerCase(),
    )?.target;

  return (previousTarget ??
    "0x0000000000000000000000000000000000000000") as Address;
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
  const shouldShowStepOutputMode =
    stepOutputs.length > 0 || currentBinding.kind === "stepOutput";

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
              Variable
            </button>
            {shouldShowStepOutputMode ? (
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
            ) : null}
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
          stepOutputs.length ? (
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
            <div className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-base-content/70">
              No compatible earlier Step Output is available. Choose Fixed or
              Variable instead.
            </div>
          )
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

function getContractDisplayName(
  contract: ContractSnapshot | undefined,
  fallbackAddress: Address,
): string {
  return (
    contract?.labels.verified ??
    contract?.labels.creator ??
    formatShortAddress(contract?.address ?? fallbackAddress)
  );
}

function formatShortAddress(address: string): string {
  return address.length > 14
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
}

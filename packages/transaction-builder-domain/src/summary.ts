import type {
  ActionDefinitionV1,
  ActionStep,
  ContractSnapshot,
} from "./schema";
import { getActionShape } from "./compile";

export interface GeneratedSummary {
  overview: string;
  keyEffects: string[];
  steps: string[];
}

export function generateSummary(
  definition: ActionDefinitionV1,
): GeneratedSummary {
  const actionShape = getActionShape(definition);
  const chainLabel = getChainLabel(definition.chainId);
  const commissionSummary = getCommissionSummary(definition);

  return {
    overview: `Runs ${definition.steps.length} ${pluralize("step", definition.steps.length)} on ${chainLabel} as a ${formatActionShape(actionShape)}. ${commissionSummary}.`,
    keyEffects: getKeyEffects(definition),
    steps: definition.steps.map((step, index) =>
      formatStep({ definition, step, stepNumber: index + 1 }),
    ),
  };
}

function getKeyEffects(definition: ActionDefinitionV1): string[] {
  const effects = [
    `Commission: ${getCommissionSummary(definition)}`,
    `Execution: ${formatActionShape(getActionShape(definition))}`,
  ];

  const sweepSteps = definition.steps.filter((step) =>
    step.kind.startsWith("sweep"),
  );
  if (sweepSteps.length) {
    effects.push(
      `Includes ${sweepSteps.length} ${pluralize("sweep step", sweepSteps.length)} that ${sweepSteps.length === 1 ? "transfers" : "transfer"} all available balance for their configured asset.`,
    );
  }

  if (getActionShape(definition) === "commissionPlan") {
    effects.push("Uses Step Outputs from earlier Action Steps.");
  }

  return effects;
}

function formatStep({
  definition,
  step,
  stepNumber,
}: {
  definition: ActionDefinitionV1;
  step: ActionStep;
  stepNumber: number;
}): string {
  const contract = definition.contracts.find(
    (candidate) => candidate.id === step.contractId,
  );
  const contractLabel = contract ? getContractLabel(contract) : step.target;
  const parameterSummary = step.parameters
    .map((binding, index) => {
      const input = step.inputs[index];
      const inputName = input?.name || `arg${index}`;
      return `${inputName}: ${formatBinding(binding)}`;
    })
    .join(", ");
  const abiSource =
    contract?.abiSource.kind === "manual" ? " [Manual ABI]" : "";
  const callValue = step.callValue
    ? ` with Eth Value ${formatBinding(step.callValue)}`
    : "";
  const parameters = parameterSummary ? `(${parameterSummary})` : "()";

  return `Step ${stepNumber}: ${contractLabel} ${step.functionSignature}${parameters}${callValue}${abiSource}`;
}

function getContractLabel(contract: ContractSnapshot): string {
  return (
    contract.labels.verified ||
    contract.labels.creator ||
    shortenAddress(contract.address)
  );
}

function getCommissionSummary(definition: ActionDefinitionV1): string {
  const token =
    definition.commissionToken.kind === "eth"
      ? "ETH"
      : definition.commissionToken.symbol ||
        shortenAddress(definition.commissionToken.address);
  const recipient = definition.commissionRoadNftId
    ? `CommissionRoad NFT #${definition.commissionRoadNftId}`
    : "the selected CommissionRoad NFT";

  if (definition.commissionFormula.kind === "flat") {
    return `${definition.commissionFormula.amount} ${token} paid to ${recipient}`;
  }

  return `${definition.commissionFormula.bps / 100}% of ${definition.commissionFormula.variable} paid in ${token} to ${recipient}`;
}

function formatBinding(binding: ActionStep["parameters"][number]): string {
  if (binding.kind === "fixed") {
    return JSON.stringify(binding.value);
  }

  if (binding.kind === "actionVariable") {
    return binding.name;
  }

  return `${binding.stepId}.output${binding.outputIndex}`;
}

function formatActionShape(actionShape: string): string {
  return actionShape === "commissionPlan"
    ? "Commission Plan"
    : "Commission Call";
}

function getChainLabel(chainId: number): string {
  if (chainId === 1) {
    return "Ethereum";
  }
  if (chainId === 8453) {
    return "Base";
  }
  if (chainId === 11155111) {
    return "Sepolia";
  }
  return `chain ${chainId}`;
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

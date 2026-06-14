import type {
  ActionDefinitionV1,
  ActionVariable,
  Address,
} from "@transaction-builder/domain";
import type { RawActionVariableValues } from "src/transactions/commissionCall";

export function getInitialActionVariableValues({
  connectedAddress,
  definition,
  variables,
}: {
  connectedAddress: Address | undefined;
  definition: ActionDefinitionV1;
  variables: ActionVariable[];
}): RawActionVariableValues {
  const sweepRecipientNames = getSweepErc20RecipientVariableNames(definition);

  return Object.fromEntries(
    variables.map((variable) => [
      variable.name,
      getInitialActionVariableValue({
        connectedAddress,
        isSweepRecipient: sweepRecipientNames.has(variable.name),
        variable,
      }),
    ]),
  );
}

export function isSweepErc20RecipientVariable(
  definition: ActionDefinitionV1,
  variableName: string,
): boolean {
  return getSweepErc20RecipientVariableNames(definition).has(variableName);
}

function getInitialActionVariableValue({
  connectedAddress,
  isSweepRecipient,
  variable,
}: {
  connectedAddress: Address | undefined;
  isSweepRecipient: boolean;
  variable: ActionVariable;
}): string | boolean {
  if (variable.type === "bool") {
    return false;
  }

  if (connectedAddress && isSweepRecipient && variable.type === "address") {
    return connectedAddress;
  }

  return "";
}

function getSweepErc20RecipientVariableNames(
  definition: ActionDefinitionV1,
): Set<string> {
  const names = new Set<string>();

  for (const step of definition.steps) {
    if (step.kind !== "sweepErc20") {
      continue;
    }

    const destinationInputIndex = step.inputs.findIndex(
      (input) => input.name?.toLowerCase() === "destination",
    );
    const destinationBinding =
      step.parameters[destinationInputIndex >= 0 ? destinationInputIndex : 1];

    if (destinationBinding?.kind === "actionVariable") {
      names.add(destinationBinding.name);
    }
  }

  return names;
}

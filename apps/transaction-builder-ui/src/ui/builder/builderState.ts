import type { ActionDefinitionV1 } from "@transaction-builder/domain";

export type BuilderDraft = ActionDefinitionV1;

export function createInitialBuilderDraft(): BuilderDraft {
  return {
    schemaVersion: 1,
    title: "",
    description: "",
    chainId: 1,
    contracts: [],
    variables: [],
    steps: [],
    commissionToken: { kind: "eth" },
    commissionFormula: { kind: "flat", amount: "0" },
  };
}

export function getDraftStepCount(draft: BuilderDraft): number {
  return draft.steps.length;
}

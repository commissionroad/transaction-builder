import "src/testing/setup";

import type { ActionDefinitionV1, Address } from "@transaction-builder/domain";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "bun:test";
import { useState, type Dispatch, type SetStateAction } from "react";
import { renderWithQueryClient } from "src/testing/render";
import { ActionStepsEditor } from "./ActionStepsEditor";

describe("ActionStepsEditor", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("allows read methods to be selected as Read Steps", async () => {
    let currentDraft = createStepOutputDraft({ includeSteps: false });
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    await userEvent.click(view.getByText("Read methods"));
    await userEvent.click(view.getByRole("button", { name: /balanceOf/i }));

    expect(view.getByText("Flow")).toBeTruthy();
    expect(view.getByText("balanceOf(address)")).toBeTruthy();
    expect(view.getByText("Step Outputs")).toBeTruthy();
    expect(view.getByText("balance")).toBeTruthy();
    expect(currentDraft.steps[0]?.kind).toBe("read");
  });

  it("lets later Contract Parameters bind to earlier matching Step Outputs", async () => {
    let currentDraft = createStepOutputDraft();
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    const stepOutputButtons = view.getAllByRole("button", {
      name: "Step Output",
    }) as HTMLButtonElement[];
    const enabledStepOutputButton = stepOutputButtons.find(
      (button) => !button.disabled,
    );
    expect(enabledStepOutputButton).toBeTruthy();

    await userEvent.click(enabledStepOutputButton as HTMLButtonElement);

    expect(
      view.getByRole("option", {
        name: "balanceOf(address) · balance (uint256)",
      }),
    ).toBeTruthy();
    expect(currentDraft.steps[1]?.parameters[1]).toEqual({
      kind: "stepOutput",
      stepId: "readBalance",
      outputIndex: 0,
    });
  });

  it("does not offer later Step Outputs to earlier Contract Parameters", () => {
    const view = renderWithQueryClient(
      <DraftHarness draft={createStepOutputDraft({ readFirst: false })} />,
    );

    const stepOutputButtons = view.getAllByRole("button", {
      name: "Step Output",
    }) as HTMLButtonElement[];

    expect(stepOutputButtons.every((button) => button.disabled)).toBe(true);
  });

  it("creates distinct Action Variables for separate fixed parameters", async () => {
    let currentDraft = createTwoAddressParameterDraft();
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    const actionVariableButtons = view.getAllByRole("button", {
      name: "Action Variable",
    });

    await userEvent.click(actionVariableButtons[0]);
    await userEvent.click(actionVariableButtons[1]);

    expect(currentDraft.variables.map((variable) => variable.name)).toEqual([
      "from",
      "to",
    ]);
    expect(currentDraft.steps[0]?.parameters).toEqual([
      { kind: "actionVariable", name: "from" },
      { kind: "actionVariable", name: "to" },
    ]);
  });
});

function DraftHarness({
  draft: initialDraft,
  onDraftChange,
}: {
  draft: ActionDefinitionV1;
  onDraftChange?: (draft: ActionDefinitionV1) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const handleChange: Dispatch<SetStateAction<ActionDefinitionV1>> = (
    value,
  ) => {
    setDraft((current) => {
      const next = typeof value === "function" ? value(current) : value;
      onDraftChange?.(next);
      return next;
    });
  };

  return <ActionStepsEditor draft={draft} onChange={handleChange} />;
}

function createStepOutputDraft({
  includeSteps = true,
  readFirst = true,
}: {
  includeSteps?: boolean;
  readFirst?: boolean;
} = {}): ActionDefinitionV1 {
  const readStep = {
    id: "readBalance",
    kind: "read" as const,
    contractId: "token",
    target: TOKEN_ADDRESS,
    functionName: "balanceOf",
    functionSignature: "balanceOf(address)",
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    parameters: [
      {
        kind: "actionVariable" as const,
        name: "account",
      },
    ],
  };
  const writeStep = {
    id: "transfer",
    kind: "write" as const,
    contractId: "token",
    target: TOKEN_ADDRESS,
    functionName: "transfer",
    functionSignature: "transfer(address,uint256)",
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "ok", type: "bool" }],
    parameters: [
      {
        kind: "actionVariable" as const,
        name: "recipient",
      },
      {
        kind: "fixed" as const,
        value: "0",
      },
    ],
  };

  return {
    schemaVersion: 1,
    title: "Transfer token balance",
    description: "Read a token balance and transfer that amount.",
    chainId: 1,
    commissionRoadNftId: "1",
    contracts: [
      {
        id: "token",
        chainId: 1,
        address: TOKEN_ADDRESS,
        labels: { verified: "MockToken" },
        abi: [
          {
            type: "function",
            name: "balanceOf",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "balance", type: "uint256" }],
          },
          {
            type: "function",
            name: "transfer",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "ok", type: "bool" }],
          },
        ],
        abiSource: { kind: "manual" },
      },
    ],
    variables: [
      {
        name: "account",
        label: "Account",
        type: "address",
      },
      {
        name: "recipient",
        label: "Recipient",
        type: "address",
      },
    ],
    steps: includeSteps
      ? readFirst
        ? [readStep, writeStep]
        : [writeStep, readStep]
      : [],
    commissionToken: { kind: "eth" },
    commissionFormula: { kind: "flat", amount: "0.01" },
  };
}

function createTwoAddressParameterDraft(): ActionDefinitionV1 {
  return {
    schemaVersion: 1,
    title: "Transfer ownership",
    description: "Test draft.",
    chainId: 1,
    commissionRoadNftId: "1",
    contracts: [
      {
        id: "token",
        chainId: 1,
        address: TOKEN_ADDRESS,
        labels: { verified: "MockToken" },
        abi: [
          {
            type: "function",
            name: "move",
            stateMutability: "nonpayable",
            inputs: [
              { name: "from", type: "address" },
              { name: "to", type: "address" },
            ],
            outputs: [],
          },
        ],
        abiSource: { kind: "manual" },
      },
    ],
    variables: [],
    steps: [
      {
        id: "move",
        kind: "write",
        contractId: "token",
        target: TOKEN_ADDRESS,
        functionName: "move",
        functionSignature: "move(address,address)",
        stateMutability: "nonpayable",
        inputs: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
        ],
        outputs: [],
        parameters: [
          {
            kind: "fixed",
            value: "0x0000000000000000000000000000000000000000",
          },
          {
            kind: "fixed",
            value: "0x0000000000000000000000000000000000000000",
          },
        ],
      },
    ],
    commissionToken: { kind: "eth" },
    commissionFormula: { kind: "flat", amount: "0.01" },
  };
}

const TOKEN_ADDRESS = "0x2222222222222222222222222222222222222222" as Address;

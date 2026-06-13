import "src/testing/setup";

import { getCommissionRoadAddresses } from "@transaction-builder/commissionroad-protocol";
import type { ActionDefinitionV1, Address } from "@transaction-builder/domain";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { useState, type Dispatch, type SetStateAction } from "react";
import { renderWithQueryClient } from "src/testing/render";
import { ActionStepsEditor } from "./ActionStepsEditor";

const originalFetch = globalThis.fetch;

describe("ActionStepsEditor", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
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

    expect(view.queryByRole("button", { name: /Sweep ERC20/i })).toBeNull();
    expect(view.queryByText("Paste ABI manually")).toBeNull();

    await userEvent.type(
      view.getByLabelText("Contract address"),
      TOKEN_ADDRESS,
    );

    expect(view.queryByRole("button", { name: /Sweep ERC20/i })).toBeNull();
    expect(await view.findByText("Paste ABI manually")).toBeTruthy();

    await userEvent.click(
      await view.findByRole("button", { name: /Choose method/i }),
    );

    await userEvent.click(
      view.getByRole("button", { name: /balanceOf\(address\)/i }),
    );

    expect(view.getByText("Flow")).toBeTruthy();
    expect(view.getByText("MockToken")).toBeTruthy();
    expect(view.getByText("balanceOf(address)")).toBeTruthy();
    expect(view.getByText("Step Outputs")).toBeTruthy();
    expect(view.getByText("balance")).toBeTruthy();
    expect(currentDraft.steps[0]?.kind).toBe("read");
  });

  it("automatically resolves an ABI after a valid contract address is entered", async () => {
    const fetchUrls: string[] = [];
    globalThis.fetch = (async (input) => {
      fetchUrls.push(String(input));
      return new Response(
        JSON.stringify({
          status: "1",
          message: "OK",
          result: [
            {
              SourceCode: "",
              ABI: JSON.stringify(TOKEN_ABI),
              Proxy: "0",
              Implementation: "",
              ContractName: "MockToken",
            },
          ],
        }),
      );
    }) as typeof fetch;
    let currentDraft = createEmptyDraft();
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    await userEvent.type(
      view.getByLabelText("Contract address"),
      TOKEN_ADDRESS,
    );

    await userEvent.click(
      await view.findByRole("button", { name: /Choose method/i }),
    );
    expect(fetchUrls).toHaveLength(1);
    expect(new URL(fetchUrls[0]).searchParams.get("action")).toBe(
      "getsourcecode",
    );

    await userEvent.click(
      view.getByRole("button", { name: /transfer\(address,uint256\)/i }),
    );

    expect(currentDraft.contracts[0]?.labels.verified).toBe("MockToken");
    expect(currentDraft.steps[0]?.functionSignature).toBe(
      "transfer(address,uint256)",
    );
  });

  it("discloses manual ABI entry when automatic lookup fails", async () => {
    globalThis.fetch = (async (_input) =>
      new Response(
        JSON.stringify({
          status: "0",
          message: "NOTOK",
          result: "Verified ABI not found",
        }),
      )) as typeof fetch;
    let currentDraft = createEmptyDraft();
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    await userEvent.type(
      view.getByLabelText("Contract address"),
      TOKEN_ADDRESS,
    );

    expect(await view.findByText(/Verified ABI not found/i)).toBeTruthy();

    await userEvent.type(
      view.getByLabelText("Manual ABI"),
      escapeUserEventText(JSON.stringify(TOKEN_ABI)),
    );
    await userEvent.click(
      view.getByRole("button", { name: "Load Manual ABI" }),
    );

    expect(await view.findByText(/Manual ABI loaded/i)).toBeTruthy();

    await userEvent.click(view.getByRole("button", { name: /Choose method/i }));

    await userEvent.click(
      view.getByRole("button", { name: /transfer\(address,uint256\)/i }),
    );

    expect(currentDraft.contracts[0]?.abiSource).toEqual({ kind: "manual" });
    expect(currentDraft.steps[0]?.functionSignature).toBe(
      "transfer(address,uint256)",
    );
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
    expect(stepOutputButtons).toHaveLength(1);

    await userEvent.click(stepOutputButtons[0]);

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

    const stepOutputButtons = view.queryAllByRole("button", {
      name: "Step Output",
    });

    expect(stepOutputButtons).toHaveLength(0);
  });

  it("creates distinct Variables for separate fixed parameters", async () => {
    let currentDraft = createTwoAddressParameterDraft();
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    const variableButtons = view.getAllByRole("button", {
      name: "Variable",
    });

    await userEvent.click(variableButtons[0]);
    await userEvent.click(variableButtons[1]);

    expect(currentDraft.variables.map((variable) => variable.name)).toEqual([
      "from",
      "to",
    ]);
    expect(currentDraft.steps[0]?.parameters).toEqual([
      { kind: "actionVariable", name: "from" },
      { kind: "actionVariable", name: "to" },
    ]);
  });

  it("deletes Variables that are no longer used after an Action Step is removed", async () => {
    let currentDraft = createTwoAddressParameterDraft();
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    const variableButtons = view.getAllByRole("button", {
      name: "Variable",
    });
    await userEvent.click(variableButtons[0]);
    await userEvent.click(variableButtons[1]);

    await userEvent.click(view.getByRole("button", { name: /Delete move/i }));

    expect(currentDraft.steps).toEqual([]);
    expect(currentDraft.variables).toEqual([]);
  });

  it("resets percentage commission when deleting the Action Step that owns its Variable", async () => {
    let currentDraft = createPercentageVariableDraft();
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    await userEvent.click(view.getByRole("button", { name: /Delete stake/i }));

    expect(currentDraft.variables).toEqual([]);
    expect(currentDraft.commissionFormula).toEqual({
      kind: "flat",
      amount: "0",
    });
  });

  it("copies full contract addresses from Action Step headers", async () => {
    const clipboardWrite = mock(async (_value: string) => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWrite },
    });

    const view = renderWithQueryClient(
      <DraftHarness draft={createStepOutputDraft()} />,
    );

    const copyButton = view.getAllByRole("button", {
      name: /Copy MockToken contract address/i,
    })[0];

    if (!copyButton) {
      throw new Error("Expected contract address copy button to render.");
    }

    await userEvent.click(copyButton);

    expect(clipboardWrite).toHaveBeenCalledWith(TOKEN_ADDRESS);
  });

  it("adds the CommissionRoad ERC20 sweep helper as a first-class Action Step", async () => {
    let currentDraft = createStepOutputDraft();
    const view = renderWithQueryClient(
      <DraftHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    await userEvent.click(
      view.getByRole("button", { name: /Add Action Step/i }),
    );
    expect(view.getByRole("button", { name: /Sweep ERC20/i })).toBeTruthy();
    await userEvent.click(view.getByRole("button", { name: /Sweep ERC20/i }));

    const commissionRoadAddress = getCommissionRoadAddresses(1).commissionRoad;
    expect(view.getByText("CommissionRoad")).toBeTruthy();
    expect(view.getByText("sweepERC20Token(address,address)")).toBeTruthy();
    expect(currentDraft.contracts.at(-1)).toMatchObject({
      address: commissionRoadAddress,
      labels: { verified: "CommissionRoad" },
    });
    expect(currentDraft.steps.at(-1)).toMatchObject({
      kind: "sweepErc20",
      target: commissionRoadAddress,
      functionSignature: "sweepERC20Token(address,address)",
      parameters: [
        { kind: "fixed", value: TOKEN_ADDRESS },
        { kind: "actionVariable", name: "recipient" },
      ],
    });
    expect(view.queryByRole("button", { name: /Sweep ERC1155/i })).toBeNull();
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

function createEmptyDraft(): ActionDefinitionV1 {
  return {
    schemaVersion: 1,
    title: "Transfer token balance",
    description: "Read a token balance and transfer that amount.",
    chainId: 1,
    commissionRoadNftId: "1",
    contracts: [],
    variables: [],
    steps: [],
    commissionToken: { kind: "eth" },
    commissionFormula: { kind: "flat", amount: "0.01" },
  };
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
        abi: TOKEN_ABI,
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

function createPercentageVariableDraft(): ActionDefinitionV1 {
  return {
    schemaVersion: 1,
    title: "Stake token",
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
            name: "stake",
            stateMutability: "nonpayable",
            inputs: [{ name: "amount", type: "uint256" }],
            outputs: [],
          },
        ],
        abiSource: { kind: "manual" },
      },
    ],
    variables: [
      {
        name: "stakeAmount",
        label: "Stake Amount",
        type: "uint256",
      },
    ],
    steps: [
      {
        id: "stake",
        kind: "write",
        contractId: "token",
        target: TOKEN_ADDRESS,
        functionName: "stake",
        functionSignature: "stake(uint256)",
        stateMutability: "nonpayable",
        inputs: [{ name: "amount", type: "uint256" }],
        outputs: [],
        parameters: [{ kind: "actionVariable", name: "stakeAmount" }],
      },
    ],
    commissionToken: { kind: "eth" },
    commissionFormula: {
      kind: "percentage",
      bps: 1,
      variable: "stakeAmount",
    },
  };
}

const TOKEN_ADDRESS = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN_ABI = [
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
];

function escapeUserEventText(value: string): string {
  return value.replace(/[{[]/g, (character) => `${character}${character}`);
}

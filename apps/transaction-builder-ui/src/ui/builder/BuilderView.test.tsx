import "src/testing/setup";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Address } from "@transaction-builder/domain";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { act, cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "src/network/wagmi";
import { routeTree } from "src/router";
import { commissionRoadTheme } from "src/ui/rainbowKitTheme";
import { BuilderView } from "./BuilderView";
import type { BuilderDraft } from "./builderState";

describe("BuilderView", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("renders the initial builder shell", async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
      defaultPendingMinMs: 0,
    });
    await act(async () => {
      await router.load();
    });

    let view: ReturnType<typeof render> | undefined;
    await act(async () => {
      view = render(
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          <QueryClientProvider client={new QueryClient()}>
            <RainbowKitProvider theme={commissionRoadTheme}>
              <RouterProvider router={router} />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>,
      );
    });

    if (!view) {
      throw new Error("BuilderView did not render");
    }

    expect(view.getByAltText("CommissionRoad")).toBeTruthy();
    expect(view.getAllByRole("link", { name: "Build" }).length).toBeGreaterThan(
      0,
    );
    expect(view.getByRole("button", { name: /Basics/i })).toBeTruthy();
    expect(view.getByLabelText("Chain")).toBeTruthy();
    expect(view.getByLabelText("Action name")).toBeTruthy();
    expect(view.getByLabelText("Description")).toBeTruthy();
    expect(view.getByText("Preview")).toBeTruthy();
    expect(view.getByText("Contract calls will appear here.")).toBeTruthy();
    expect(view.queryByLabelText("Contract address")).toBeNull();

    await userEvent.click(view.getByRole("button", { name: /Flow/i }));

    expect(view.getByText("Add Action Step")).toBeTruthy();
    expect(view.getByLabelText("Contract address")).toBeTruthy();

    await userEvent.click(view.getByRole("button", { name: /Review/i }));

    expect(view.getByText("Code Snippets")).toBeTruthy();
    expect(
      (
        view.getByRole("button", {
          name: /Share Action/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("renders Variables in the sidebar above Preview", () => {
    const view = renderBuilder(
      <BuilderView initialDraft={createDraftWithVariable()} />,
    );

    const variablesHeading = view.getByRole("heading", { name: "Variables" });
    const previewHeading = view.getByRole("heading", { name: "Preview" });

    expect(view.getByText("Internal name: recipient")).toBeTruthy();
    expect(view.getByLabelText(/Variables are values/i)).toBeTruthy();
    expect(
      variablesHeading.compareDocumentPosition(previewHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("does not mark Review complete for a title-only draft", () => {
    const view = renderBuilder(
      <BuilderView
        initialDraft={{
          ...createDraftWithVariable(),
          title: "Stake",
          description: "",
          commissionRoadNftId: undefined,
          contracts: [],
          variables: [],
          steps: [],
        }}
      />,
    );

    const reviewStep = view.getByRole("button", { name: /Review/i });

    expect(reviewStep.querySelector('[data-completed="true"]')).toBeNull();
  });

  it("collapses Variables into a single-open accordion on the Flow stage", async () => {
    const view = renderBuilder(
      <BuilderView initialDraft={createDraftWithTwoVariables()} />,
    );

    expect(view.getByDisplayValue("Recipient")).toBeTruthy();
    expect(view.getByDisplayValue("Amount")).toBeTruthy();

    await userEvent.click(view.getByRole("button", { name: /Flow/i }));

    expect(view.queryByDisplayValue("Recipient")).toBeNull();
    expect(view.queryByDisplayValue("Amount")).toBeNull();

    await userEvent.click(view.getByRole("button", { name: /Recipient/ }));

    expect(view.getByDisplayValue("Recipient")).toBeTruthy();
    expect(view.queryByDisplayValue("Amount")).toBeNull();

    await userEvent.click(view.getByRole("button", { name: /Amount/ }));

    expect(view.queryByDisplayValue("Recipient")).toBeNull();
    expect(view.getByDisplayValue("Amount")).toBeTruthy();
  });

  it("adds new Flow Variables collapsed and lets creators expand them", async () => {
    const view = renderBuilder(
      <BuilderView initialDraft={createDraftWithFixedParameter()} />,
    );

    await userEvent.click(view.getByRole("button", { name: /Flow/i }));
    await userEvent.click(view.getByRole("button", { name: "Variable" }));

    expect(view.getByRole("heading", { name: "Variables" })).toBeTruthy();
    const variableButton = view.getByRole("button", {
      name: "To to · address",
    });
    expect(variableButton).toBeTruthy();
    expect(view.queryByDisplayValue("To")).toBeNull();

    await userEvent.click(variableButton);

    expect(view.getByDisplayValue("To")).toBeTruthy();
  });
});

function renderBuilder(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={new QueryClient()}>
        <RainbowKitProvider theme={commissionRoadTheme}>
          {ui}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>,
  );
}

function createDraftWithVariable(): BuilderDraft {
  return {
    schemaVersion: 1,
    title: "Transfer token",
    description: "Transfer a token to a recipient.",
    chainId: 1,
    contracts: [
      {
        id: "token",
        chainId: 1,
        address: TOKEN_ADDRESS,
        labels: { verified: "MockToken" },
        abi: [
          {
            type: "function",
            name: "transfer",
            stateMutability: "nonpayable",
            inputs: [{ name: "to", type: "address" }],
            outputs: [],
          },
        ],
        abiSource: { kind: "manual" },
      },
    ],
    variables: [
      {
        name: "recipient",
        label: "Recipient",
        type: "address",
        description: "Wallet receiving the token.",
      },
    ],
    steps: [
      {
        id: "transfer",
        kind: "write",
        contractId: "token",
        target: TOKEN_ADDRESS,
        functionName: "transfer",
        functionSignature: "transfer(address)",
        stateMutability: "nonpayable",
        inputs: [{ name: "to", type: "address" }],
        outputs: [],
        parameters: [{ kind: "actionVariable", name: "recipient" }],
      },
    ],
    commissionToken: { kind: "eth" },
    commissionFormula: { kind: "flat", amount: "0" },
  };
}

function createDraftWithTwoVariables(): BuilderDraft {
  const draft = createDraftWithVariable();

  return {
    ...draft,
    variables: [
      ...draft.variables,
      {
        name: "amount",
        label: "Amount",
        type: "uint256",
        description: "Amount to transfer.",
      },
    ],
  };
}

function createDraftWithFixedParameter(): BuilderDraft {
  const draft = createDraftWithVariable();

  return {
    ...draft,
    variables: [],
    steps: [
      {
        ...draft.steps[0],
        parameters: [
          {
            kind: "fixed",
            value: "0x0000000000000000000000000000000000000000",
          },
        ],
      },
    ],
  };
}

const TOKEN_ADDRESS = "0x2222222222222222222222222222222222222222" as Address;

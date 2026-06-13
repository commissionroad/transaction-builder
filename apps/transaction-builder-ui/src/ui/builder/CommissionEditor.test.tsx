import "src/testing/setup";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "bun:test";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "src/network/wagmi";
import { createInitialBuilderDraft, type BuilderDraft } from "./builderState";
import { CommissionEditor } from "./CommissionEditor";

describe("CommissionEditor", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("lets creators configure an ERC20 Commission Token manually", async () => {
    let currentDraft = createInitialBuilderDraft();
    const view = render(
      <CommissionEditorHarness
        draft={currentDraft}
        onDraftChange={(draft) => {
          currentDraft = draft;
        }}
      />,
    );

    await userEvent.click(view.getByRole("button", { name: "ERC20" }));
    await userEvent.type(view.getByLabelText("ERC20 token address"), "0xabc");
    await userEvent.type(view.getByLabelText("ERC20 token symbol"), "USDC");
    await userEvent.type(view.getByLabelText("ERC20 token decimals"), "6");

    expect(view.getByText("Enter a valid ERC20 token address.")).toBeTruthy();
    expect(
      view.getByText(/Permit2 Funding is added automatically/),
    ).toBeTruthy();
    expect(currentDraft.commissionToken).toEqual({
      kind: "erc20",
      address: "0xabc",
      symbol: "USDC",
      decimals: 6,
    });
  });
});

function CommissionEditorHarness({
  draft: initialDraft,
  onDraftChange,
}: {
  draft: BuilderDraft;
  onDraftChange: (draft: BuilderDraft) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const handleChange = (nextDraft: BuilderDraft) => {
    setDraft(nextDraft);
    onDraftChange(nextDraft);
  };

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <CommissionEditor draft={draft} onChange={handleChange} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

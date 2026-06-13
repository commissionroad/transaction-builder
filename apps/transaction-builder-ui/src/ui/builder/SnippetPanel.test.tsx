import "src/testing/setup";

import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "bun:test";
import { createLidoSweepAction } from "src/testing/fixtures";
import { SnippetPanel } from "./SnippetPanel";

describe("SnippetPanel", () => {
  it("renders highlighted viem and wagmi snippets for a valid action", async () => {
    const view = render(<SnippetPanel draft={createLidoSweepAction()} />);

    expect(view.getByText("Code Snippets")).toBeTruthy();
    expect(view.getByText("commissionAction.ts")).toBeTruthy();
    expect(view.container.querySelector(".token")).toBeTruthy();
    expect(view.container.textContent).toContain("executeStakeETHIntoLido");

    await userEvent.click(view.getByRole("tab", { name: "Wagmi" }));

    expect(view.getByText("ActionButton.tsx")).toBeTruthy();
    expect(view.container.textContent).toContain("useWriteContract");
  });
});

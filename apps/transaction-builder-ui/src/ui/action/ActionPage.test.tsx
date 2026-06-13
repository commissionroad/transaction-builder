import "src/testing/setup";

import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { createPublishedActionResponse } from "src/testing/fixtures";
import { renderWithQueryClient } from "src/testing/render";
import { ActionPage } from "./ActionPage";

describe("ActionPage", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    mock.restore();
  });

  it("loads a Published Action by slug and renders public inspection details", async () => {
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      expect(String(input)).toEndWith("/actions/stake-lido-abc123");
      return jsonResponse(createPublishedActionResponse());
    }) as unknown as typeof fetch;

    const view = renderWithQueryClient(<ActionPage slug="stake-lido-abc123" />);

    await waitFor(() =>
      expect(
        view.getByRole("heading", { name: "Stake ETH into Lido" }),
      ).toBeTruthy(),
    );
    expect(
      view.getByText("Stake ETH and sweep stETH back to the recipient."),
    ).toBeTruthy();
    expect(view.getByText("Generated Summary")).toBeTruthy();
    expect(
      view.getByText(/Runs 2 steps on Ethereum as a Commission Call/),
    ).toBeTruthy();
    expect(view.getByText("Technical Details")).toBeTruthy();
    expect(view.getByLabelText("ETH to stake")).toBeTruthy();
    expect(view.getByLabelText("Recipient")).toBeTruthy();
    expect(view.getByRole("button", { name: "Execute" })).toBeTruthy();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

import "src/testing/setup";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "src/network/wagmi";
import { createPublishedActionResponse } from "src/testing/fixtures";
import { commissionRoadTheme } from "src/ui/rainbowKitTheme";
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

    const view = render(
      <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
        <QueryClientProvider client={new QueryClient()}>
          <RainbowKitProvider theme={commissionRoadTheme}>
            <ActionPage slug="stake-lido-abc123" />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>,
    );

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

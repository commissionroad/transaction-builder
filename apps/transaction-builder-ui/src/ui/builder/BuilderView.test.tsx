import "src/testing/setup";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { act, cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "bun:test";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "src/network/wagmi";
import { routeTree } from "src/router";
import { commissionRoadTheme } from "src/ui/rainbowKitTheme";

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
});

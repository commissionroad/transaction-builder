import "src/testing/setup";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "src/network/wagmi";
import { routeTree } from "src/router";
import { commissionRoadTheme } from "src/ui/rainbowKitTheme";

describe("BuilderView", () => {
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

    expect(view?.getByAltText("CommissionRoad")).toBeTruthy();
    expect(
      view?.getAllByRole("link", { name: "Build" }).length,
    ).toBeGreaterThan(0);
    expect(view?.getByLabelText("Action Chain")).toBeTruthy();
    expect(view?.getByLabelText("Action name")).toBeTruthy();
    expect(view?.getByLabelText("Description")).toBeTruthy();
    expect(view?.getByText("No Action Steps yet")).toBeTruthy();
    expect(
      (
        view?.getByRole("button", {
          name: /Share Action/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

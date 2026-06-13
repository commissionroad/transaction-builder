import { afterEach, describe, expect, it, mock } from "bun:test";
import { getCommissionRoadPortfolioNfts } from "./apiClient";

const originalFetch = globalThis.fetch;

describe("getCommissionRoadPortfolioNfts", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("loads wallet NFTs from the CommissionRoad portfolio API", async () => {
    const calls: string[] = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return jsonResponse([
        {
          id: 1,
          chainId: 1,
          name: "CommissionRoad #1",
          claimableBalances: [],
        },
      ]);
    }) as unknown as typeof fetch;

    const nfts = await getCommissionRoadPortfolioNfts(
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    );

    expect(calls).toEqual([
      "https://api.commissionroad.xyz/portfolio/0x742d35Cc6634C0532925a3b844Bc454e4438f44e/nfts",
    ]);
    expect(nfts).toEqual([
      {
        id: 1,
        chainId: 1,
        name: "CommissionRoad #1",
        claimableBalances: [],
      },
    ]);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

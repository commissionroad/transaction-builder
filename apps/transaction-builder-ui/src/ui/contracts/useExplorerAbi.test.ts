import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Address } from "@transaction-builder/domain";
import { fetchExplorerAbi } from "./useExplorerAbi";

const originalFetch = globalThis.fetch;

describe("fetchExplorerAbi", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("queries Etherscan V2 with the selected Action Chain", async () => {
    const calls: string[] = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return jsonResponse({
        status: "1",
        message: "OK",
        result: [createExplorerContract({ contractName: "DirectContract" })],
      });
    }) as unknown as typeof fetch;

    const snapshot = await fetchExplorerAbi({
      address: DIRECT_ADDRESS,
      chainId: 8453,
    });

    expect(snapshot.label).toBe("DirectContract");
    expect(snapshot.abiSource).toEqual({
      kind: "explorer",
      explorer: "BaseScan",
    });
    expect(snapshot.abi).toEqual(DIRECT_ABI);

    const url = new URL(calls[0] ?? "");
    expect(url.href.startsWith("https://api.etherscan.io/v2/api")).toBe(true);
    expect(url.searchParams.get("chainid")).toBe("8453");
    expect(url.searchParams.get("module")).toBe("contract");
    expect(url.searchParams.get("action")).toBe("getsourcecode");
    expect(url.searchParams.get("address")).toBe(DIRECT_ADDRESS);
  });

  it("follows verified proxy implementation addresses and returns the implementation ABI", async () => {
    const calls: string[] = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      calls.push(url.toString());

      if (url.searchParams.get("address") === LIDO_PROXY_ADDRESS) {
        return jsonResponse({
          status: "1",
          message: "OK",
          result: [
            createExplorerContract({
              abi: PROXY_ABI,
              contractName: "Lido",
              implementation: LIDO_IMPLEMENTATION_ADDRESS,
              proxy: "1",
            }),
          ],
        });
      }

      return jsonResponse({
        status: "1",
        message: "OK",
        result: [
          createExplorerContract({
            abi: LIDO_IMPLEMENTATION_ABI,
            contractName: "LidoImplementation",
          }),
        ],
      });
    }) as unknown as typeof fetch;

    const snapshot = await fetchExplorerAbi({
      address: LIDO_PROXY_ADDRESS,
      chainId: 1,
    });

    expect(snapshot.abi).toEqual(LIDO_IMPLEMENTATION_ABI);
    expect(snapshot.label).toBe("LidoImplementation");
    expect(snapshot.abiSource).toEqual({
      kind: "explorerProxy",
      explorer: "Etherscan",
      implementationAddress: LIDO_IMPLEMENTATION_ADDRESS,
    });
    expect(calls).toHaveLength(2);
    expect(new URL(calls[0] ?? "").searchParams.get("address")).toBe(
      LIDO_PROXY_ADDRESS,
    );
    expect(new URL(calls[1] ?? "").searchParams.get("address")).toBe(
      LIDO_IMPLEMENTATION_ADDRESS,
    );
  });

  it("surfaces explorer error messages", async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        status: "0",
        message: "NOTOK",
        result: "Missing/Invalid API Key",
      }),
    ) as unknown as typeof fetch;

    await expect(
      fetchExplorerAbi({ address: DIRECT_ADDRESS, chainId: 1 }),
    ).rejects.toThrow("Missing/Invalid API Key");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

function createExplorerContract({
  abi = DIRECT_ABI,
  contractName,
  implementation = "",
  proxy = "0",
}: {
  abi?: readonly unknown[];
  contractName: string;
  implementation?: string;
  proxy?: "0" | "1";
}) {
  return {
    SourceCode: "contract Test {}",
    ABI: JSON.stringify(abi),
    ContractName: contractName,
    Implementation: implementation,
    Proxy: proxy,
  };
}

const DIRECT_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;
const LIDO_PROXY_ADDRESS =
  "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" as Address;
const LIDO_IMPLEMENTATION_ADDRESS =
  "0x17144556fd3424edc8fc8a4c940b2d04936d17eb" as Address;

const DIRECT_ABI = [
  {
    type: "function",
    name: "direct",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "ok", type: "bool" }],
  },
] as const;
const PROXY_ABI = [
  {
    type: "function",
    name: "proxyOnly",
    stateMutability: "view",
    inputs: [],
    outputs: [],
  },
] as const;
const LIDO_IMPLEMENTATION_ABI = [
  {
    type: "function",
    name: "submit",
    stateMutability: "payable",
    inputs: [{ name: "_referral", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

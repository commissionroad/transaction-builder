import type { ActionDefinitionV1 } from "@transaction-builder/domain";
import { describe, expect, it } from "bun:test";
import { createApp } from "../app";
import type {
  CreatePublishedActionInput,
  PublishedActionRecord,
  PublishedActionRepository,
} from "./repository";

describe("Published Action routes", () => {
  it("GET /health returns ok", async () => {
    const app = createApp({ actionRepository: createMemoryRepository() });

    const response = await app.handle(new Request("http://localhost/health"));
    const body = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });

  it("POST /actions rejects malformed body", async () => {
    const app = createApp({ actionRepository: createMemoryRepository() });

    const response = await app.handle(
      new Request("http://localhost/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "" }),
      }),
    );
    const body = (await response.json()) as {
      error: string;
      issues: Array<unknown>;
    };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid Action Definition");
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("POST /actions stores valid Published Action JSON", async () => {
    const repository = createMemoryRepository();
    const app = createApp({ actionRepository: repository });

    const response = await app.handle(
      new Request("http://localhost/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createLidoSweepAction()),
      }),
    );
    const body = (await response.json()) as {
      slug: string;
      chainId: number;
      commissionRoadNftId: string | null;
      title: string;
      schemaVersion: number;
      definition: ActionDefinitionV1;
    };

    expect(response.status).toBe(201);
    expect(body.slug).toHaveLength(10);
    expect(body.chainId).toBe(1);
    expect(body.commissionRoadNftId).toBe("1");
    expect(body.title).toBe("Stake ETH into Lido");
    expect(body.schemaVersion).toBe(1);
    expect(body.definition).toEqual(createLidoSweepAction());
    expect(repository.records.size).toBe(1);
  });

  it("GET /actions/:slug returns stored action", async () => {
    const repository = createMemoryRepository();
    const app = createApp({ actionRepository: repository });
    await repository.create({
      slug: "abc123DEF4",
      definition: createLidoSweepAction(),
    });

    const response = await app.handle(
      new Request("http://localhost/actions/abc123DEF4"),
    );
    const body = (await response.json()) as {
      slug: string;
      definition: ActionDefinitionV1;
    };

    expect(response.status).toBe(200);
    expect(body.slug).toBe("abc123DEF4");
    expect(body.definition.title).toBe("Stake ETH into Lido");
  });

  it("GET /actions/:slug returns 404 for missing slug", async () => {
    const app = createApp({ actionRepository: createMemoryRepository() });

    const response = await app.handle(
      new Request("http://localhost/actions/missing123"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Action not found" });
  });
});

function createMemoryRepository(): PublishedActionRepository & {
  records: Map<string, PublishedActionRecord>;
} {
  const records = new Map<string, PublishedActionRecord>();

  return {
    records,

    async hasSlug(slug) {
      return records.has(slug);
    },

    async create({ slug, definition }: CreatePublishedActionInput) {
      const record: PublishedActionRecord = {
        slug,
        chainId: definition.chainId,
        commissionRoadNftId: definition.commissionRoadNftId ?? null,
        title: definition.title,
        schemaVersion: definition.schemaVersion,
        definition,
        createdAt: new Date("2026-06-13T00:00:00.000Z"),
      };
      records.set(slug, record);
      return record;
    },

    async findBySlug(slug) {
      return records.get(slug) ?? null;
    },
  };
}

const LIDO_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
const COMMISSION_ROAD_ADDRESS = "0xc12dC152f12CaABF68F101Dbe496c4173828935E";

function createLidoSweepAction(): ActionDefinitionV1 {
  return {
    schemaVersion: 1,
    title: "Stake ETH into Lido",
    description: "Stake ETH and sweep stETH back to the recipient.",
    chainId: 1,
    commissionRoadNftId: "1",
    contracts: [
      {
        id: "lido",
        chainId: 1,
        address: LIDO_ADDRESS,
        labels: { verified: "Lido stETH" },
        abi: [{ type: "function", name: "submit" }],
        abiSource: { kind: "explorer", explorer: "etherscan" },
      },
      {
        id: "commissionRoad",
        chainId: 1,
        address: COMMISSION_ROAD_ADDRESS,
        labels: { verified: "CommissionRoad" },
        abi: [{ type: "function", name: "sweepERC20Token" }],
        abiSource: { kind: "explorer", explorer: "etherscan" },
      },
    ],
    variables: [
      {
        name: "stakeAmount",
        label: "ETH to stake",
        type: "uint256",
        unit: { kind: "eth", symbol: "ETH", decimals: 18 },
      },
      {
        name: "recipient",
        label: "Recipient",
        type: "address",
      },
    ],
    steps: [
      {
        id: "submit",
        kind: "write",
        contractId: "lido",
        target: LIDO_ADDRESS,
        functionName: "submit",
        functionSignature: "submit(address)",
        stateMutability: "payable",
        inputs: [{ name: "_referral", type: "address" }],
        outputs: [{ type: "uint256" }],
        parameters: [
          {
            kind: "fixed",
            value: "0x0000000000000000000000000000000000000000",
          },
        ],
        callValue: { kind: "actionVariable", name: "stakeAmount" },
      },
      {
        id: "sweep",
        kind: "sweepErc20",
        contractId: "commissionRoad",
        target: COMMISSION_ROAD_ADDRESS,
        label: "Sweep stETH",
        functionName: "sweepERC20Token",
        functionSignature: "sweepERC20Token(address,address)",
        stateMutability: "nonpayable",
        inputs: [
          { name: "token", type: "address" },
          { name: "destination", type: "address" },
        ],
        outputs: [],
        parameters: [
          { kind: "fixed", value: LIDO_ADDRESS },
          { kind: "actionVariable", name: "recipient" },
        ],
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

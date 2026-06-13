import { describe, expect, it } from "bun:test";
import type { ActionDefinitionV1 } from "./schema";
import { validateDraft } from "./schema";

const LIDO_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
const COMMISSION_ROAD_ADDRESS = "0xc12dC152f12CaABF68F101Dbe496c4173828935E";

describe("validateDraft", () => {
  it("accepts a valid independent ETH Action Definition", () => {
    const result = validateDraft(createLidoSweepAction());

    expect(result.success).toBe(true);
  });

  it("rejects an unsupported Action Chain", () => {
    const result = validateDraft({ ...createLidoSweepAction(), chainId: 10 });

    expect(result.success).toBe(false);
    expect(getIssueMessages(result)).toContain("Invalid input");
  });

  it("rejects duplicate Action Variable names", () => {
    const action = createLidoSweepAction();
    const result = validateDraft({
      ...action,
      variables: [...action.variables, action.variables[0]],
    });

    expect(result.success).toBe(false);
    expect(getIssueMessages(result)).toContain(
      'Duplicate Action Variable "stakeAmount"',
    );
  });

  it("rejects Step Output references to later Action Steps", () => {
    const action = createDependentAction();
    const result = validateDraft({
      ...action,
      steps: [
        {
          ...action.steps[1],
          parameters: [
            action.steps[1].parameters[0],
            { kind: "stepOutput", stepId: "readBalance", outputIndex: 0 },
          ],
        },
        action.steps[0],
      ],
    });

    expect(result.success).toBe(false);
    expect(getIssueMessages(result)).toContain(
      "Step Outputs can only reference earlier Action Steps",
    );
  });

  it("rejects unused Read Step outputs", () => {
    const action = createDependentAction();
    const result = validateDraft({
      ...action,
      steps: [action.steps[0]],
    });

    expect(result.success).toBe(false);
    expect(getIssueMessages(result)).toContain(
      "Read Step output must be used by a later Action Step",
    );
  });

  it("rejects missing Contract Parameter bindings", () => {
    const action = createLidoSweepAction();
    const result = validateDraft({
      ...action,
      steps: [
        {
          ...action.steps[0],
          parameters: [],
        },
        action.steps[1],
      ],
    });

    expect(result.success).toBe(false);
    expect(getIssueMessages(result)).toContain(
      "Expected 1 Contract Parameter bindings, received 0",
    );
  });

  it("accepts a Published Action with an ABI Snapshot", () => {
    const action = createLidoSweepAction();
    const result = validateDraft({
      ...action,
      contracts: action.contracts.map((contract) => ({
        ...contract,
        abiSource:
          contract.id === "lido"
            ? {
                kind: "explorerProxy",
                explorer: "etherscan",
                implementationAddress:
                  "0x17144556fd3424edc8fc8a4c940b2d04936d17eb",
              }
            : contract.abiSource,
      })),
    });

    expect(result.success).toBe(true);
  });
});

export function createLidoSweepAction(): ActionDefinitionV1 {
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

export function createDependentAction(): ActionDefinitionV1 {
  const action = createLidoSweepAction();
  return {
    ...action,
    steps: [
      {
        id: "readBalance",
        kind: "read",
        contractId: "lido",
        target: LIDO_ADDRESS,
        functionName: "balanceOf",
        functionSignature: "balanceOf(address)",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "balance", type: "uint256" }],
        parameters: [{ kind: "actionVariable", name: "recipient" }],
      },
      {
        id: "transferExact",
        kind: "write",
        contractId: "lido",
        target: LIDO_ADDRESS,
        functionName: "transfer",
        functionSignature: "transfer(address,uint256)",
        stateMutability: "nonpayable",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
        parameters: [
          { kind: "actionVariable", name: "recipient" },
          { kind: "stepOutput", stepId: "readBalance", outputIndex: 0 },
        ],
      },
    ],
  };
}

function getIssueMessages(result: ReturnType<typeof validateDraft>): string[] {
  return result.success ? [] : result.issues.map((issue) => issue.message);
}

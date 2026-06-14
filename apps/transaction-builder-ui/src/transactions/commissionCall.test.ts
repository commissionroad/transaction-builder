import "src/testing/setup";

import {
  getCommissionRoadAddresses,
  permit2Abi,
} from "@transaction-builder/commissionroad-protocol";
import type { ActionDefinitionV1, Address } from "@transaction-builder/domain";
import { describe, expect, it } from "bun:test";
import { createLidoSweepAction } from "src/testing/fixtures";
import { decodeFunctionData, formatUnits, type PublicClient } from "viem";
import { prepareCommissionCall, previewCommissionCall } from "./commissionCall";

describe("prepareCommissionCall", () => {
  it("builds a classic ETH commissionCall payload from Action Variable values", () => {
    const result = prepareCommissionCall({
      definition: createLidoSweepAction(),
      rawValues: {
        stakeAmount: "1",
        recipient: "0x1111111111111111111111111111111111111111",
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.prepared.functionName).toBe("commissionCall");
    if (result.prepared.functionName !== "commissionCall") return;
    expect(result.prepared.batchCallData).toHaveLength(2);
    expect(result.prepared.batchCallData[0]?.value).toBe(
      1_000_000_000_000_000_000n,
    );
    expect(result.prepared.commission).toBe(100_000_000_000_000n);
    expect(formatUnits(result.prepared.commission, 18)).toBe("0.0001");
    expect(result.prepared.value).toBe(1_000_100_000_000_000_000n);
  });

  it("treats payable call value variables without units as ETH amounts", () => {
    const definition = createLidoSweepAction();
    const result = prepareCommissionCall({
      definition: {
        ...definition,
        variables: definition.variables.map((variable) =>
          variable.name === "stakeAmount"
            ? { ...variable, unit: undefined }
            : variable,
        ),
      },
      rawValues: {
        stakeAmount: "1",
        recipient: "0x1111111111111111111111111111111111111111",
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.prepared.functionName).toBe("commissionCall");
    if (result.prepared.functionName !== "commissionCall") return;
    expect(result.prepared.batchCallData[0]?.value).toBe(
      1_000_000_000_000_000_000n,
    );
    expect(result.prepared.value).toBe(1_000_100_000_000_000_000n);
  });

  it("rejects missing Action Variable values before encoding calldata", () => {
    const result = prepareCommissionCall({
      definition: createLidoSweepAction(),
      rawValues: {
        stakeAmount: "1",
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.message).toBe("Recipient is required.");
  });

  it("requires a Permit2 authorization before ERC20 commission execution", () => {
    const result = prepareCommissionCall({
      definition: createErc20CommissionAction(),
      rawValues: {
        stakeAmount: "1",
        recipient: RECIPIENT_ADDRESS,
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.message).toContain("Sign a Permit2 authorization");
  });

  it("prepends a Permit2 Funding call for exact flat ERC20 commissions", () => {
    const definition = createErc20CommissionAction();
    const result = prepareCommissionCall({
      definition,
      permit2Authorization: {
        owner: RECIPIENT_ADDRESS,
        signature: "0x1234",
        nonce: 99n,
        deadline: 1_800_000_000n,
      },
      rawValues: {
        stakeAmount: "1",
        recipient: RECIPIENT_ADDRESS,
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const addresses = getCommissionRoadAddresses(definition.chainId);
    expect(result.prepared.functionName).toBe("commissionCall");
    if (result.prepared.functionName !== "commissionCall") return;
    expect(result.prepared.batchCallData).toHaveLength(3);
    expect(result.prepared.batchCallData[0]?.target).toBe(addresses.permit2);
    expect(result.prepared.commissionToken).toBe(USDC_ADDRESS);
    expect(result.prepared.commission).toBe(250_000n);
    expect(result.prepared.value).toBe(1_000_000_000_000_000_000n);

    const decoded = decodeFunctionData({
      abi: permit2Abi,
      data: result.prepared.batchCallData[0]?.callData ?? "0x",
    });

    expect(decoded.functionName).toBe("permitTransferFrom");
    const [permit, transferDetails, owner, signature] =
      decoded.args as readonly [
        {
          permitted: { amount: bigint; token: Address };
          nonce: bigint;
        },
        { requestedAmount: bigint; to: Address },
        Address,
        `0x${string}`,
      ];
    expect(permit.permitted).toEqual({
      token: USDC_ADDRESS,
      amount: 250_000n,
    });
    expect(permit.nonce).toBe(99n);
    expect(transferDetails).toEqual({
      to: addresses.commissionRoad,
      requestedAmount: 250_000n,
    });
    expect(owner).toBe(RECIPIENT_ADDRESS);
    expect(signature).toBe("0x1234");
  });

  it("calculates percentage ERC20 commissions from selected Action Variables", () => {
    const result = previewCommissionCall({
      definition: createErc20PercentageCommissionAction(),
      rawValues: {
        stakeAmount: "1",
        recipient: RECIPIENT_ADDRESS,
        usdcAmount: "100",
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.preview.commission).toBe(10_000n);
    expect(formatUnits(result.preview.commission, 6)).toBe("0.01");
  });

  it("requires a public client before preparing Commission Plan calldata", () => {
    const result = prepareCommissionCall({
      definition: createDependentTransferAction(),
      rawValues: {
        account: RECIPIENT_ADDRESS,
        recipient: RECIPIENT_ADDRESS,
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0]?.message).toBe(
      "Unable to prepare this Commission Plan without a public client.",
    );
  });

  it("builds commissionPlan commands for Step Output bindings", () => {
    const result = prepareCommissionCall({
      definition: createDependentTransferAction(),
      publicClient: createFakePublicClient(),
      rawValues: {
        account: RECIPIENT_ADDRESS,
        recipient: RECIPIENT_ADDRESS,
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.prepared.functionName).toBe("commissionPlan");
    if (result.prepared.functionName !== "commissionPlan") return;
    expect(result.prepared.commands).toHaveLength(2);
    expect(result.prepared.state.length).toBeGreaterThan(0);
    expect(result.prepared.commission).toBe(10_000_000_000_000_000n);
    expect(result.prepared.value).toBe(10_000_000_000_000_000n);
  });

  it("prepends Permit2 Funding to ERC20 Commission Plans", () => {
    const definition = {
      ...createDependentTransferAction(),
      commissionToken: {
        kind: "erc20" as const,
        address: USDC_ADDRESS,
        symbol: "USDC",
        decimals: 6,
      },
      commissionFormula: {
        kind: "flat" as const,
        amount: "0.25",
      },
    };
    const result = prepareCommissionCall({
      definition,
      permit2Authorization: {
        owner: RECIPIENT_ADDRESS,
        signature: "0x1234",
        nonce: 99n,
        deadline: 1_800_000_000n,
      },
      publicClient: createFakePublicClient(),
      rawValues: {
        account: RECIPIENT_ADDRESS,
        recipient: RECIPIENT_ADDRESS,
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.prepared.functionName).toBe("commissionPlan");
    if (result.prepared.functionName !== "commissionPlan") return;
    expect(result.prepared.commands).toHaveLength(3);
    expect(result.prepared.permit2Funding).toEqual({
      amount: 250_000n,
      target: getCommissionRoadAddresses(definition.chainId).permit2,
    });
  });
});

function createErc20CommissionAction(): ActionDefinitionV1 {
  return {
    ...createLidoSweepAction(),
    commissionToken: {
      kind: "erc20",
      address: USDC_ADDRESS,
      symbol: "USDC",
      decimals: 6,
    },
    commissionFormula: {
      kind: "flat",
      amount: "0.25",
    },
  };
}

function createErc20PercentageCommissionAction(): ActionDefinitionV1 {
  const definition = createErc20CommissionAction();
  return {
    ...definition,
    variables: [
      ...definition.variables,
      {
        name: "usdcAmount",
        label: "USDC amount",
        type: "uint256",
        unit: {
          kind: "erc20",
          tokenAddress: USDC_ADDRESS,
          symbol: "USDC",
          decimals: 6,
        },
      },
    ],
    commissionFormula: {
      kind: "percentage",
      bps: 1,
      variable: "usdcAmount",
    },
  };
}

function createDependentTransferAction(): ActionDefinitionV1 {
  return {
    schemaVersion: 1,
    title: "Transfer token balance",
    description: "Read a token balance and transfer that amount.",
    chainId: 1,
    commissionRoadNftId: "1",
    contracts: [
      {
        id: "token",
        chainId: 1,
        address: TOKEN_ADDRESS,
        labels: { verified: "MockToken" },
        abi: [
          {
            type: "function",
            name: "balanceOf",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "balance", type: "uint256" }],
          },
          {
            type: "function",
            name: "transfer",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "ok", type: "bool" }],
          },
        ],
        abiSource: { kind: "manual" },
      },
    ],
    variables: [
      {
        name: "account",
        label: "Account",
        type: "address",
      },
      {
        name: "recipient",
        label: "Recipient",
        type: "address",
      },
    ],
    steps: [
      {
        id: "readBalance",
        kind: "read",
        contractId: "token",
        target: TOKEN_ADDRESS,
        functionName: "balanceOf",
        functionSignature: "balanceOf(address)",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "balance", type: "uint256" }],
        parameters: [{ kind: "actionVariable", name: "account" }],
      },
      {
        id: "transfer",
        kind: "write",
        contractId: "token",
        target: TOKEN_ADDRESS,
        functionName: "transfer",
        functionSignature: "transfer(address,uint256)",
        stateMutability: "nonpayable",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "ok", type: "bool" }],
        parameters: [
          { kind: "actionVariable", name: "recipient" },
          { kind: "stepOutput", stepId: "readBalance", outputIndex: 0 },
        ],
      },
    ],
    commissionToken: { kind: "eth" },
    commissionFormula: {
      kind: "flat",
      amount: "0.01",
    },
  };
}

function createFakePublicClient(): PublicClient {
  return {
    call: async () => "0x",
    getBlock: async () => ({}),
    getBytecode: async () => "0x",
    getChainId: async () => 1,
    getStorageAt: async () => "0x",
    getTransactionReceipt: async () => null,
    readContract: async () => 0n,
  } as unknown as PublicClient;
}

const RECIPIENT_ADDRESS =
  "0x1111111111111111111111111111111111111111" as Address;
const TOKEN_ADDRESS = "0x2222222222222222222222222222222222222222" as Address;
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;

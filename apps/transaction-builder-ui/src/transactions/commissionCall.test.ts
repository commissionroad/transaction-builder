import "src/testing/setup";

import {
  getCommissionRoadAddresses,
  permit2Abi,
} from "@transaction-builder/commissionroad-protocol";
import type { ActionDefinitionV1, Address } from "@transaction-builder/domain";
import { describe, expect, it } from "bun:test";
import { createLidoSweepAction } from "src/testing/fixtures";
import { decodeFunctionData, formatUnits } from "viem";
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
    expect(result.prepared.batchCallData).toHaveLength(2);
    expect(result.prepared.batchCallData[0]?.value).toBe(
      1_000_000_000_000_000_000n,
    );
    expect(result.prepared.commission).toBe(100_000_000_000_000n);
    expect(formatUnits(result.prepared.commission, 18)).toBe("0.0001");
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

const RECIPIENT_ADDRESS =
  "0x1111111111111111111111111111111111111111" as Address;
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;

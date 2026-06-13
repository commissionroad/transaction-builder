import "src/testing/setup";

import { describe, expect, it } from "bun:test";
import { createLidoSweepAction } from "src/testing/fixtures";
import { formatUnits } from "viem";
import { prepareCommissionCall } from "./commissionCall";

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
});

import { describe, expect, it } from "bun:test";
import { getActionTargets } from "../compile";
import type { Address } from "../schema";
import { createLidoSweepAction } from "../schema.test";
import {
  createPermit2FundingCallArgs,
  createPermit2FundingRequest,
  requiresPermit2Funding,
} from "./permit2Funding";

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address;
const COMMISSION_ROAD_ADDRESS =
  "0xc12dC152f12CaABF68F101Dbe496c4173828935E" as Address;
const OWNER_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;

describe("Permit2 Funding", () => {
  it("adds the system Permit2 target for ERC20 Commission Tokens", () => {
    const definition = createErc20CommissionAction();

    expect(requiresPermit2Funding(definition)).toBe(true);
    expect(getActionTargets(definition)).toContain(PERMIT2_ADDRESS);
  });

  it("builds a typed-data request for the exact commission amount", () => {
    const request = createPermit2FundingRequest({
      definition: createErc20CommissionAction(),
      commission: 12_345n,
      owner: OWNER_ADDRESS,
      permit2Address: PERMIT2_ADDRESS,
      commissionRoadAddress: COMMISSION_ROAD_ADDRESS,
      nonce: 99n,
      deadline: 1_800_000_000n,
    });

    expect(request.domain).toEqual({
      name: "Permit2",
      chainId: 1,
      verifyingContract: PERMIT2_ADDRESS,
    });
    expect(request.message).toEqual({
      permitted: {
        token: USDC_ADDRESS,
        amount: 12_345n,
      },
      spender: COMMISSION_ROAD_ADDRESS,
      nonce: 99n,
      deadline: 1_800_000_000n,
    });
    expect(request.transferDetails).toEqual({
      to: COMMISSION_ROAD_ADDRESS,
      requestedAmount: 12_345n,
    });
  });

  it("creates Permit2 call args without generating approve-to-CommissionRoad", () => {
    const request = createPermit2FundingRequest({
      definition: createErc20CommissionAction(),
      commission: 12_345n,
      owner: OWNER_ADDRESS,
      permit2Address: PERMIT2_ADDRESS,
      commissionRoadAddress: COMMISSION_ROAD_ADDRESS,
      nonce: 99n,
      deadline: 1_800_000_000n,
    });

    expect(
      createPermit2FundingCallArgs({
        request,
        signature: "0xpermit2signature",
      }),
    ).toEqual([
      request.permit,
      request.transferDetails,
      OWNER_ADDRESS,
      "0xpermit2signature",
    ]);
  });
});

function createErc20CommissionAction() {
  return {
    ...createLidoSweepAction(),
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
}

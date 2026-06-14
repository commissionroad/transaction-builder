import type { Address } from "@transaction-builder/domain";
import { describe, expect, it } from "bun:test";
import { createLidoSweepAction } from "src/testing/fixtures";
import { getExecutableActionVariables } from "src/transactions/commissionCall";
import { getInitialActionVariableValues } from "./actionVariableDefaults";

describe("getInitialActionVariableValues", () => {
  it("defaults sweep ERC20 recipient variables to the connected wallet address", () => {
    const definition = createLidoSweepAction();
    const connectedAddress =
      "0x1111111111111111111111111111111111111111" as Address;

    expect(
      getInitialActionVariableValues({
        connectedAddress,
        definition,
        variables: getExecutableActionVariables(definition),
      }),
    ).toMatchObject({
      recipient: connectedAddress,
      stakeAmount: "",
    });
  });

  it("leaves sweep ERC20 recipient variables empty when no wallet is connected", () => {
    const definition = createLidoSweepAction();

    expect(
      getInitialActionVariableValues({
        connectedAddress: undefined,
        definition,
        variables: getExecutableActionVariables(definition),
      }),
    ).toMatchObject({
      recipient: "",
      stakeAmount: "",
    });
  });
});

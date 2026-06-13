import { describe, expect, it } from "bun:test";
import {
  getActionShape,
  getActionTargets,
  getCallValueBindings,
} from "./compile";
import { createDependentAction, createLidoSweepAction } from "./schema.test";

describe("compile helpers", () => {
  it("compiles independent Actions as Commission Calls", () => {
    expect(getActionShape(createLidoSweepAction())).toBe("commissionCall");
  });

  it("compiles Actions with Step Output bindings as Commission Plans", () => {
    expect(getActionShape(createDependentAction())).toBe("commissionPlan");
  });

  it("includes sweep helper targets in Action targets", () => {
    const targets = getActionTargets(createLidoSweepAction());

    expect(targets).toContain("0xc12dC152f12CaABF68F101Dbe496c4173828935E");
  });

  it("includes Permit2 Funding targets in Action targets", () => {
    const action = createLidoSweepAction();
    const permit2Target = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const targets = getActionTargets({
      ...action,
      steps: [
        {
          id: "permit2Funding",
          kind: "permit2Funding",
          contractId: "permit2",
          target: permit2Target,
          functionName: "permitTransferFrom",
          functionSignature:
            "permitTransferFrom((address,uint256),address,uint256,bytes)",
          stateMutability: "nonpayable",
          inputs: [],
          outputs: [],
          parameters: [],
        },
        ...action.steps,
      ],
    });

    expect(targets).toContain(permit2Target);
  });

  it("discovers Call Value sources", () => {
    expect(getCallValueBindings(createLidoSweepAction())).toEqual([
      {
        stepId: "submit",
        binding: { kind: "actionVariable", name: "stakeAmount" },
      },
    ]);
  });
});

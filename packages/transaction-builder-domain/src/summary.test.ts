import { describe, expect, it } from "bun:test";
import { generateSummary } from "./summary";
import { createDependentAction, createLidoSweepAction } from "./schema.test";

describe("generateSummary", () => {
  it("summarizes a short Lido submit and sweep Action", () => {
    const summary = generateSummary(createLidoSweepAction());

    expect(summary.overview).toContain("Runs 2 steps on Ethereum");
    expect(summary.overview).toContain("Commission Call");
    expect(summary.keyEffects).toContain(
      "Includes 1 sweep step that transfers all available balance for their configured asset.",
    );
    expect(summary.steps[0]).toContain("Lido stETH submit(address)");
    expect(summary.steps[0]).toContain("with Eth Value stakeAmount");
    expect(summary.steps[1]).toContain("CommissionRoad sweepERC20Token");
  });

  it("summarizes long Actions without guessing intent", () => {
    const action = createLidoSweepAction();
    const summary = generateSummary({
      ...action,
      steps: [
        ...action.steps,
        ...Array.from({ length: 4 }, (_, index) => ({
          ...action.steps[1],
          id: `sweep-${index}`,
        })),
      ],
    });

    expect(summary.overview).toContain("Runs 6 steps");
    expect(summary.steps).toHaveLength(6);
  });

  it("falls back to addresses for unknown contract labels", () => {
    const action = createLidoSweepAction();
    const summary = generateSummary({
      ...action,
      contracts: action.contracts.map((contract) => ({
        ...contract,
        labels: {},
      })),
    });

    expect(summary.steps[0]).toContain("0xae7a...fE84");
  });

  it("includes manual ABI source metadata in step details", () => {
    const action = createLidoSweepAction();
    const summary = generateSummary({
      ...action,
      contracts: action.contracts.map((contract) =>
        contract.id === "lido"
          ? { ...contract, abiSource: { kind: "manual" } }
          : contract,
      ),
    });

    expect(summary.steps[0]).toContain("[Manual ABI]");
  });

  it("marks dependent Actions as Commission Plans", () => {
    const summary = generateSummary(createDependentAction());

    expect(summary.overview).toContain("Commission Plan");
    expect(summary.keyEffects).toContain(
      "Uses Step Outputs from earlier Action Steps.",
    );
  });
});

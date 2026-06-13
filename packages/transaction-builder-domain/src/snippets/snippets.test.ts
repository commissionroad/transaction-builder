import { describe, expect, it } from "bun:test";
import { createDependentAction, createLidoSweepAction } from "../schema.test";
import { generateViemSnippet } from "./viem";
import { generateWagmiSnippet } from "./wagmi";

describe("snippet generation", () => {
  it("generates a Viem snippet with a parameterized function", () => {
    const snippet = generateViemSnippet(createLidoSweepAction());

    expect(snippet).toContain("export async function executeStakeETHIntoLido");
    expect(snippet).toContain("walletClient: WalletClient");
    expect(snippet).toContain("stakeAmount: bigint;");
    expect(snippet).toContain("recipient: Address;");
  });

  it("generates a Wagmi snippet with a parameterized hook", () => {
    const snippet = generateWagmiSnippet(createLidoSweepAction());

    expect(snippet).toContain("export function useExecuteStakeETHIntoLido");
    expect(snippet).toContain("const { writeContractAsync");
    expect(snippet).toContain("executeAction");
  });

  it("includes Action Variables as function arguments", () => {
    const snippet = generateViemSnippet(createLidoSweepAction());

    expect(snippet).toContain("stakeAmount,");
    expect(snippet).toContain("recipient,");
    expect(snippet).toContain("value: stakeAmount");
  });

  it("accepts parsed onchain values instead of human input strings", () => {
    const snippet = generateViemSnippet(createLidoSweepAction());

    expect(snippet).toContain("stakeAmount: bigint;");
    expect(snippet).not.toContain("parseEther");
    expect(snippet).not.toContain("parseUnits");
  });

  it("does not generate chain switching code", () => {
    const snippet = generateWagmiSnippet(createLidoSweepAction());

    expect(snippet).not.toContain("switchChain");
    expect(snippet).not.toContain("useSwitchChain");
  });

  it("rejects dependent Actions until Commission Plan snippets are implemented", () => {
    expect(() => generateViemSnippet(createDependentAction())).toThrow(
      "independent Actions only",
    );
  });
});

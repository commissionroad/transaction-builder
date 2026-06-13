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

  it("generates Viem Commission Plan snippets for Step Output bindings", () => {
    const snippet = generateViemSnippet(createDependentAction());

    expect(snippet).toContain("@cowprotocol/sdk-weiroll");
    expect(snippet).toContain("new WeirollPlanner()");
    expect(snippet).toContain('functionName: "commissionPlan"');
    expect(snippet).toContain("stepOutput_readBalance_0");
    expect(snippet).toContain(
      'functions["transfer(address,uint256)"](recipient, stepOutput_readBalance_0)',
    );
  });

  it("generates Wagmi Commission Plan snippets for Step Output bindings", () => {
    const snippet = generateWagmiSnippet(createDependentAction());

    expect(snippet).toContain("usePublicClient");
    expect(snippet).toContain("setGlobalAdapter(adapter)");
    expect(snippet).toContain('functionName: "commissionPlan"');
    expect(snippet).toContain("commands as Hex[]");
  });

  it("generates Viem Permit2 funding code for ERC20 commissions", () => {
    const snippet = generateViemSnippet(createErc20CommissionAction());

    expect(snippet).toContain('parseUnits("0.25", 6)');
    expect(snippet).toContain("publicClient: PublicClient");
    expect(snippet).toContain('functionName: "approve"');
    expect(snippet).toContain(
      'args: ["0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address, commission]',
    );
    expect(snippet).toContain("walletClient.signTypedData");
    expect(snippet).toContain('functionName: "permitTransferFrom"');
    expect(snippet).toContain("permit2FundingCall");
  });

  it("generates Wagmi Permit2 funding code for ERC20 commissions", () => {
    const snippet = generateWagmiSnippet(createErc20CommissionAction());

    expect(snippet).toContain("useSignTypedData");
    expect(snippet).toContain("usePublicClient");
    expect(snippet).toContain("writeContractAsync");
    expect(snippet).toContain("signTypedDataAsync");
    expect(snippet).toContain('functionName: "permitTransferFrom"');
    expect(snippet).toContain("publicClient.waitForTransactionReceipt");
  });

  it("keeps ETH Action snippet ABIs scoped to selected calls", () => {
    const snippet = generateViemSnippet(createLidoSweepAction());

    expect(snippet).toContain('"name": "commissionCall"');
    expect(snippet).toContain('"name": "submit"');
    expect(snippet).toContain('"name": "sweepERC20Token"');
    expect(snippet).toContain("const commissionRoadContractAbi");
    expect(snippet).toContain("abi: commissionRoadContractAbi");
    expect(snippet).not.toContain("commissionCallFeePercent");
    expect(snippet).not.toContain("sweepERC1155Token");
    expect(snippet).not.toContain("setAllowlist");
    expect(snippet).not.toContain('"name": "decimals"');
  });

  it("keeps Commission Plan snippet ABIs scoped to selected calls", () => {
    const snippet = generateWagmiSnippet(createDependentAction());

    expect(snippet).toContain('"name": "commissionPlan"');
    expect(snippet).toContain('"name": "balanceOf"');
    expect(snippet).toContain('"name": "transfer"');
    expect(snippet).not.toContain('"name": "commissionCall"');
    expect(snippet).not.toContain("sweepERC20Token");
    expect(snippet).not.toContain("mintTo");
  });

  it("keeps ERC20 funding ABIs scoped to allowance, approval, and Permit2 transfer", () => {
    const snippet = generateViemSnippet(createErc20CommissionAction());

    expect(snippet).toContain('"name": "allowance"');
    expect(snippet).toContain('"name": "approve"');
    expect(snippet).toContain('"name": "permitTransferFrom"');
    expect(snippet).not.toContain('"name": "decimals"');
    expect(snippet).not.toContain('"name": "symbol"');
    expect(snippet).not.toContain('"name": "DOMAIN_SEPARATOR"');
    expect(snippet).not.toContain('"name": "permitWitnessTransferFrom"');
    expect(snippet).not.toContain('"name": "transferFrom"');
  });

  it("generates Permit2 funding code for ERC20 Commission Plans", () => {
    const snippet = generateViemSnippet({
      ...createDependentAction(),
      commissionToken: {
        kind: "erc20" as const,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const,
        symbol: "USDC",
        decimals: 6,
      },
      commissionFormula: {
        kind: "flat" as const,
        amount: "0.25",
      },
    });

    expect(snippet).toContain("permitTransferFrom(tuple,tuple,address,bytes)");
    expect(snippet).toContain("planner.add(");
    expect(snippet).toContain('functionName: "commissionPlan"');
  });
});

function createErc20CommissionAction() {
  return {
    ...createLidoSweepAction(),
    commissionToken: {
      kind: "erc20" as const,
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const,
      symbol: "USDC",
      decimals: 6,
    },
    commissionFormula: {
      kind: "flat" as const,
      amount: "0.25",
    },
  };
}

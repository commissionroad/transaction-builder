import type { ActionDefinitionV1 } from "@transaction-builder/domain";

const LIDO_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
const COMMISSION_ROAD_ADDRESS = "0xc12dC152f12CaABF68F101Dbe496c4173828935E";

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
        abi: [
          {
            type: "function",
            name: "submit",
            stateMutability: "payable",
            inputs: [{ name: "_referral", type: "address" }],
            outputs: [{ type: "uint256" }],
          },
        ],
        abiSource: { kind: "explorer", explorer: "etherscan" },
      },
      {
        id: "commissionRoad",
        chainId: 1,
        address: COMMISSION_ROAD_ADDRESS,
        labels: { verified: "CommissionRoad" },
        abi: [
          {
            type: "function",
            name: "sweepERC20Token",
            stateMutability: "nonpayable",
            inputs: [
              { name: "token", type: "address" },
              { name: "destination", type: "address" },
            ],
            outputs: [],
          },
        ],
        abiSource: { kind: "explorer", explorer: "etherscan" },
      },
    ],
    variables: [
      {
        name: "stakeAmount",
        label: "ETH to stake",
        description: "Amount of ETH Bob wants to stake.",
        type: "uint256",
        unit: { kind: "eth", symbol: "ETH", decimals: 18 },
      },
      {
        name: "recipient",
        label: "Recipient",
        description: "Wallet receiving the stETH.",
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

export function createPublishedActionResponse(
  definition = createLidoSweepAction(),
) {
  return {
    slug: "stake-lido-abc123",
    chainId: definition.chainId,
    commissionRoadNftId: definition.commissionRoadNftId ?? null,
    title: definition.title,
    schemaVersion: definition.schemaVersion,
    definition,
    createdAt: "2026-06-13T00:00:00.000Z",
  };
}

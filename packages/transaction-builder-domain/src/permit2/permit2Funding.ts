import type { ActionDefinitionV1, Address } from "../schema";

export type Hex = `0x${string}`;

export interface Permit2FundingRequest {
  domain: {
    name: "Permit2";
    chainId: ActionDefinitionV1["chainId"];
    verifyingContract: Address;
  };
  types: typeof permit2TypedDataTypes;
  primaryType: "PermitTransferFrom";
  message: Permit2TypedDataMessage;
  permit: Permit2TransferPermit;
  transferDetails: Permit2TransferDetails;
  owner: Address;
}

export interface Permit2TransferPermit {
  permitted: {
    token: Address;
    amount: bigint;
  };
  nonce: bigint;
  deadline: bigint;
}

export interface Permit2TransferDetails {
  to: Address;
  requestedAmount: bigint;
}

export interface Permit2TypedDataMessage extends Permit2TransferPermit {
  spender: Address;
}

export const permit2TypedDataTypes = {
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
} as const;

export function requiresPermit2Funding(
  definition: ActionDefinitionV1,
): boolean {
  return definition.commissionToken.kind === "erc20";
}

export function createPermit2FundingRequest({
  commission,
  commissionRoadAddress,
  definition,
  deadline,
  nonce,
  owner,
  permit2Address,
}: {
  commission: bigint;
  commissionRoadAddress: Address;
  definition: ActionDefinitionV1;
  deadline: bigint;
  nonce: bigint;
  owner: Address;
  permit2Address: Address;
}): Permit2FundingRequest {
  if (definition.commissionToken.kind !== "erc20") {
    throw new Error("Permit2 Funding requires an ERC20 Commission Token");
  }

  const permit: Permit2TransferPermit = {
    permitted: {
      token: definition.commissionToken.address,
      amount: commission,
    },
    nonce,
    deadline,
  };
  const transferDetails: Permit2TransferDetails = {
    to: commissionRoadAddress,
    requestedAmount: commission,
  };

  return {
    domain: {
      name: "Permit2",
      chainId: definition.chainId,
      verifyingContract: permit2Address,
    },
    types: permit2TypedDataTypes,
    primaryType: "PermitTransferFrom",
    message: {
      ...permit,
      spender: commissionRoadAddress,
    },
    permit,
    transferDetails,
    owner,
  };
}

export function createPermit2FundingCallArgs({
  request,
  signature,
}: {
  request: Permit2FundingRequest;
  signature: Hex;
}): readonly [Permit2TransferPermit, Permit2TransferDetails, Address, Hex] {
  return [request.permit, request.transferDetails, request.owner, signature];
}

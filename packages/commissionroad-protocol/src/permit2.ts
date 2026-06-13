import { PERMIT2_ADDRESS, commissionRoadAddressesByChain } from "./addresses";
import type { Address, SupportedChainId } from "./chains";

export function getPermit2Address(chainId: SupportedChainId): Address {
  return commissionRoadAddressesByChain[chainId].permit2 ?? PERMIT2_ADDRESS;
}

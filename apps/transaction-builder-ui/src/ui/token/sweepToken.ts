import type { ActionStep, Address } from "@transaction-builder/domain";
import { isAddress } from "viem";

export function getFixedSweepErc20TokenAddress(
  step: ActionStep | undefined,
): Address | undefined {
  if (!step || step.kind !== "sweepErc20") {
    return undefined;
  }

  const tokenBinding = step.parameters[0];
  if (
    tokenBinding?.kind !== "fixed" ||
    typeof tokenBinding.value !== "string" ||
    !isAddress(tokenBinding.value)
  ) {
    return undefined;
  }

  return tokenBinding.value as Address;
}

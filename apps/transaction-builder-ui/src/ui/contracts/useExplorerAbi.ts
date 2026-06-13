import { getExplorerConfig } from "@transaction-builder/commissionroad-protocol";
import type { Address, ContractSnapshot } from "@transaction-builder/domain";
import { useQuery } from "@tanstack/react-query";
import type { Abi } from "viem";
import type { BuilderDraft } from "../builder/builderState";

type ExplorerContract = {
  SourceCode: string;
  ABI: string;
  Proxy: "0" | "1";
  Implementation: string;
  ContractName?: string;
};

type ExplorerAbiResult =
  | {
      status: "1";
      message: "OK";
      result: ExplorerContract[];
    }
  | {
      status: "0";
      message: "NOTOK";
      result: string | [];
    };

export interface ExplorerAbiSnapshot {
  abi: Abi;
  abiSource: ContractSnapshot["abiSource"];
  label?: string;
}

export function useExplorerAbi({
  address,
  chainId,
  enabled,
}: {
  address: Address | undefined;
  chainId: BuilderDraft["chainId"];
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["explorerAbi", chainId, address],
    enabled: enabled && !!address,
    retry: false,
    queryFn: async () => {
      if (!address) {
        throw new Error("Contract address is required");
      }

      return fetchExplorerAbi({ address, chainId });
    },
  });
}

export async function fetchExplorerAbi({
  address,
  chainId,
}: {
  address: Address;
  chainId: BuilderDraft["chainId"];
}): Promise<ExplorerAbiSnapshot> {
  const explorer = getExplorerConfig(chainId);
  const contract = await fetchExplorerContract({ address, chainId });
  const abiSource: ContractSnapshot["abiSource"] =
    contract.Proxy === "1" && isAddress(contract.Implementation)
      ? {
          kind: "explorerProxy",
          explorer: explorer.name,
          implementationAddress: contract.Implementation as Address,
        }
      : { kind: "explorer", explorer: explorer.name };

  if (contract.Proxy === "1" && isAddress(contract.Implementation)) {
    const implementation = await fetchExplorerContract({
      address: contract.Implementation as Address,
      chainId,
    });
    return {
      abi: JSON.parse(implementation.ABI) as Abi,
      abiSource,
      label: implementation.ContractName || contract.ContractName,
    };
  }

  return {
    abi: JSON.parse(contract.ABI) as Abi,
    abiSource,
    label: contract.ContractName,
  };
}

async function fetchExplorerContract({
  address,
  chainId,
}: {
  address: Address;
  chainId: BuilderDraft["chainId"];
}): Promise<ExplorerContract> {
  const explorer = getExplorerConfig(chainId);
  const url = new URL(explorer.apiUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", address);
  if (import.meta.env.VITE_ETHERSCAN_API_KEY) {
    url.searchParams.set("apikey", import.meta.env.VITE_ETHERSCAN_API_KEY);
  }

  const response = await fetch(url);
  const payload = (await response.json()) as ExplorerAbiResult;

  if (payload.status !== "1" || !Array.isArray(payload.result)) {
    throw new Error("ABI lookup failed");
  }

  const [contract] = payload.result;
  if (!contract || contract.ABI === "Contract source code not verified") {
    throw new Error("Verified ABI not found");
  }

  return contract;
}

function isAddress(value: string | undefined): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value ?? "");
}

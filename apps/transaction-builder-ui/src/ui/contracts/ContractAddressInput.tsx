import type { Address, ContractSnapshot } from "@transaction-builder/domain";
import { AlertTriangle, Check, FileJson, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { BuilderDraft } from "../builder/builderState";
import { createContractId } from "../builder/builderState";
import { useExplorerAbi } from "./useExplorerAbi";

export function ContractAddressInput({
  chainId,
  existingContracts,
  onContractResolved,
}: {
  chainId: BuilderDraft["chainId"];
  existingContracts: ContractSnapshot[];
  onContractResolved: (contract: ContractSnapshot) => void;
}) {
  const [addressText, setAddressText] = useState("");
  const [shouldLookup, setShouldLookup] = useState(false);
  const [manualAbiText, setManualAbiText] = useState("");
  const [manualAbiError, setManualAbiError] = useState<string | null>(null);
  const address = useMemo(
    () => (isAddress(addressText) ? (addressText as Address) : undefined),
    [addressText],
  );
  const query = useExplorerAbi({
    address,
    chainId,
    enabled: shouldLookup,
  });

  const handleUseExplorerAbi = () => {
    if (!address || !query.data) return;
    onContractResolved({
      id: createContractId(existingContracts),
      chainId,
      address,
      labels: query.data.label ? { verified: query.data.label } : {},
      abi: [...query.data.abi],
      abiSource: query.data.abiSource,
    });
    setAddressText("");
    setShouldLookup(false);
  };

  const handleUseManualAbi = () => {
    setManualAbiError(null);
    if (!address) {
      setManualAbiError("Enter a valid contract address first.");
      return;
    }

    try {
      const abi = JSON.parse(manualAbiText) as unknown[];
      if (!Array.isArray(abi) || !abi.length) {
        throw new Error("ABI must be a non-empty JSON array.");
      }

      onContractResolved({
        id: createContractId(existingContracts),
        chainId,
        address,
        labels: { creator: "Manual ABI" },
        abi,
        abiSource: { kind: "manual" },
      });
      setAddressText("");
      setManualAbiText("");
      setShouldLookup(false);
    } catch (error) {
      setManualAbiError(
        error instanceof Error ? error.message : "Manual ABI is invalid.",
      );
    }
  };

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="daisy-form-control">
          <span className="daisy-label pb-2">
            <span className="daisy-label-text font-medium">
              Contract address
            </span>
          </span>
          <input
            className="daisy-input daisy-input-bordered w-full font-mono text-sm"
            placeholder="0x..."
            value={addressText}
            onChange={(event) => {
              setAddressText(event.target.value.trim());
              setShouldLookup(false);
            }}
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            className="daisy-btn daisy-btn-secondary"
            disabled={!address || query.isFetching}
            onClick={() => setShouldLookup(true)}
            type="button"
          >
            <Search className="size-4" />
            Lookup ABI
          </button>
          <button
            className="daisy-btn"
            disabled={!address || !query.data}
            onClick={handleUseExplorerAbi}
            type="button"
          >
            <Check className="size-4" />
            Add
          </button>
        </div>
      </div>

      {query.isError ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>{getLookupErrorMessage(query.error)}</span>
        </div>
      ) : null}

      {query.data ? (
        <div className="mt-3 rounded-lg bg-success p-3 text-sm text-neutral">
          ABI resolved{query.data.label ? ` for ${query.data.label}` : ""}. Add
          the contract to choose a method.
        </div>
      ) : null}

      <div className="mt-4">
        <label className="daisy-form-control">
          <span className="daisy-label pb-2">
            <span className="daisy-label-text inline-flex items-center gap-2 font-medium">
              <FileJson className="size-4" />
              Manual ABI
            </span>
          </span>
          <textarea
            className="daisy-textarea daisy-textarea-bordered min-h-28 w-full font-mono text-xs"
            placeholder='[{"type":"function","name":"submit",...}]'
            value={manualAbiText}
            onChange={(event) => setManualAbiText(event.target.value)}
          />
        </label>
        {manualAbiError ? (
          <p className="mt-2 text-sm text-error">{manualAbiError}</p>
        ) : null}
        <button
          className="daisy-btn daisy-btn-outline mt-3"
          disabled={!address || !manualAbiText.trim()}
          onClick={handleUseManualAbi}
          type="button"
        >
          Use Manual ABI
        </button>
      </div>
    </div>
  );
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function getLookupErrorMessage(error: Error | null): string {
  const message = error?.message;
  if (!message) {
    return "ABI lookup failed. Paste a verified ABI below if the explorer cannot resolve this contract.";
  }

  return `${message}. Paste a verified ABI below if the explorer cannot resolve this contract.`;
}

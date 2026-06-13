import type { Address, ContractSnapshot } from "@transaction-builder/domain";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AbiFunctionFragment,
  BuilderDraft,
} from "../builder/builderState";
import { createContractId } from "../builder/builderState";
import { MethodPicker } from "./MethodPicker";
import { useExplorerAbi } from "./useExplorerAbi";

export function ContractAddressInput({
  chainId,
  existingContracts,
  onCancel,
  onStepSelected,
  showCancel = true,
  stepNumber,
}: {
  chainId: BuilderDraft["chainId"];
  existingContracts: ContractSnapshot[];
  onCancel: () => void;
  onStepSelected: (
    contract: ContractSnapshot,
    functionFragment: AbiFunctionFragment,
  ) => void;
  showCancel?: boolean;
  stepNumber: number;
}) {
  const [addressText, setAddressText] = useState("");
  const [manualContract, setManualContract] = useState<ContractSnapshot | null>(
    null,
  );
  const [manualAbiText, setManualAbiText] = useState("");
  const [manualAbiError, setManualAbiError] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const address = useMemo(
    () => (isAddress(addressText) ? (addressText as Address) : undefined),
    [addressText],
  );
  const existingContract = useMemo(
    () =>
      address
        ? existingContracts.find(
            (contract) =>
              contract.chainId === chainId &&
              contract.address.toLowerCase() === address.toLowerCase(),
          )
        : undefined,
    [address, chainId, existingContracts],
  );
  const query = useExplorerAbi({
    address,
    chainId,
    enabled: !!address && !existingContract && !manualContract,
  });
  const shouldShowInlineSuccess = Boolean(
    address && (existingContract || query.data),
  );

  const resolvedContract = useMemo(() => {
    if (!address) return undefined;
    if (manualContract) return manualContract;
    if (existingContract) return existingContract;
    if (!query.data) return undefined;

    return {
      id: createContractId(existingContracts),
      chainId,
      address,
      labels: query.data.label ? { verified: query.data.label } : {},
      abi: [...query.data.abi],
      abiSource: query.data.abiSource,
    } satisfies ContractSnapshot;
  }, [
    address,
    chainId,
    existingContract,
    existingContracts,
    manualContract,
    query.data,
  ]);

  useEffect(() => {
    if (query.isError) {
      setIsManualOpen(true);
    }
  }, [query.isError]);

  useEffect(() => {
    addressInputRef.current?.focus();
  }, []);

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

      setManualContract({
        id: createContractId(existingContracts),
        chainId,
        address,
        labels: { creator: "Manual ABI" },
        abi,
        abiSource: { kind: "manual" },
      });
      setIsManualOpen(false);
    } catch (error) {
      setManualAbiError(
        error instanceof Error ? error.message : "Manual ABI is invalid.",
      );
    }
  };

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="daisy-badge daisy-badge-secondary daisy-badge-outline">
              Step {stepNumber}
            </span>
            <h3 className="font-semibold">Add Action Step</h3>
          </div>
          <p className="text-sm text-base-content/70">
            Paste a contract address. Methods appear as soon as the ABI is
            ready.
          </p>
        </div>
        {showCancel ? (
          <button
            aria-label="Cancel new Action Step"
            className="daisy-btn daisy-btn-ghost daisy-btn-sm"
            onClick={onCancel}
            type="button"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-3">
        <label className="daisy-form-control">
          <span className="daisy-label pb-2">
            <span className="daisy-label-text font-medium">
              Contract address
            </span>
          </span>
          <span className="relative block">
            <input
              ref={addressInputRef}
              className="daisy-input daisy-input-bordered w-full pr-10 font-mono text-sm"
              placeholder="0x..."
              value={addressText}
              onChange={(event) => {
                setAddressText(event.target.value.trim());
                setManualContract(null);
                setManualAbiError(null);
                setManualAbiText("");
                setIsManualOpen(false);
              }}
            />
            {shouldShowInlineSuccess ? (
              <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-success" />
            ) : null}
          </span>
        </label>
      </div>

      {addressText && !address ? (
        <p className="mt-2 text-sm text-base-content/60">
          Enter a full 0x contract address to resolve its ABI.
        </p>
      ) : null}

      {address && query.isFetching ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-base-300 bg-base-200 p-3 text-sm">
          <Loader2 className="size-4 animate-spin text-secondary" />
          Resolving ABI from the block explorer...
        </div>
      ) : null}

      {query.isError ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>{getLookupErrorMessage(query.error)}</span>
        </div>
      ) : null}

      {manualContract ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-medium">Manual ABI loaded</div>
            <div className="text-base-content/70">
              Choose a method below to add this step.
            </div>
          </div>
        </div>
      ) : null}

      {resolvedContract ? (
        <div className="mt-4">
          <MethodPicker
            contract={resolvedContract}
            onAddStep={(fragment) => onStepSelected(resolvedContract, fragment)}
          />
        </div>
      ) : null}

      <details
        className="mt-4 rounded-lg border border-base-300 bg-base-200"
        onToggle={(event) => setIsManualOpen(event.currentTarget.open)}
        open={isManualOpen}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <FileJson className="size-4" />
            Paste ABI manually
          </span>
        </summary>
        <div className="border-t border-base-300 p-4 pt-3">
          <label className="daisy-form-control">
            <span className="daisy-label pb-2">
              <span className="daisy-label-text font-medium">Manual ABI</span>
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
            Load Manual ABI
          </button>
        </div>
      </details>
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

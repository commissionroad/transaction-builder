import type {
  ActionDefinitionV1,
  ActionVariable,
} from "@transaction-builder/domain";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  prepareCommissionCall,
  previewCommissionCall,
  type RawActionVariableValues,
} from "src/transactions/commissionCall";
import { ExecutionChecklist } from "./ExecutionChecklist";
import { usePermit2Preflight } from "./usePermit2Preflight";
import {
  isAllowlistBlocking,
  isAllowlistPending,
  type AllowlistStatus,
} from "src/ui/allowlist/useAllowlistStatus";
import { formatUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

export function ActionVariableForm({
  allowlistStatus,
  definition,
}: {
  allowlistStatus: AllowlistStatus;
  definition: ActionDefinitionV1;
}) {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: definition.chainId });
  const { openConnectModal } = useConnectModal();
  const [rawValues, setRawValues] = useState<RawActionVariableValues>(() =>
    Object.fromEntries(
      definition.variables.map((variable) => [
        variable.name,
        variable.type === "bool" ? false : "",
      ]),
    ),
  );
  const preview = useMemo(
    () => previewCommissionCall({ definition, rawValues }),
    [definition, rawValues],
  );
  const permit2Preflight = usePermit2Preflight({ definition, preview });
  const prepared = useMemo(
    () =>
      prepareCommissionCall({
        definition,
        permit2Authorization:
          permit2Preflight.kind === "erc20"
            ? permit2Preflight.authorization
            : undefined,
        publicClient,
        rawValues,
      }),
    [definition, permit2Preflight, publicClient, rawValues],
  );
  const {
    data: hash,
    error: writeError,
    isPending,
    writeContract,
  } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const isAllowlistBlocked = isAllowlistBlocking(allowlistStatus);
  const isAllowlistLoading = isAllowlistPending(allowlistStatus);

  const handleExecute = () => {
    if (isAllowlistBlocked || isAllowlistLoading) {
      return;
    }

    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (permit2Preflight.kind === "erc20" && !permit2Preflight.canExecute) {
      return;
    }

    if (!prepared.success) {
      return;
    }

    writeContract({
      address: prepared.prepared.address,
      abi: prepared.prepared.abi,
      functionName: prepared.prepared.functionName,
      args: prepared.prepared.args,
      value: prepared.prepared.value,
      chainId: prepared.prepared.chainId,
    });
  };

  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-4">
        <div>
          <h2 className="text-lg font-semibold">Action Inputs</h2>
          <p className="mt-1 text-sm text-base-content/70">
            These values fill the creator-selected Variables.
          </p>
        </div>

        {definition.variables.length ? (
          <form className="grid gap-4">
            {definition.variables.map((variable) => (
              <ActionVariableInput
                key={variable.name}
                onChange={(value) =>
                  setRawValues((current) => ({
                    ...current,
                    [variable.name]: value,
                  }))
                }
                value={rawValues[variable.name] ?? ""}
                variable={variable}
              />
            ))}
          </form>
        ) : (
          <div className="rounded-lg bg-base-200 p-4 text-sm text-base-content/70">
            This Action does not require any user-provided inputs.
          </div>
        )}

        <ExecutionPreview
          definition={definition}
          preparation={prepared}
          preview={preview}
          transactionHash={hash}
          writeError={writeError}
        />
        <ExecutionChecklist preflight={permit2Preflight} />

        <button
          className="daisy-btn daisy-btn-primary w-full"
          disabled={
            isPending ||
            receipt.isLoading ||
            isAllowlistBlocked ||
            isAllowlistLoading ||
            (permit2Preflight.kind === "erc20" && !permit2Preflight.canExecute)
          }
          onClick={handleExecute}
          type="button"
        >
          {isPending || receipt.isLoading ? (
            <span className="daisy-loading daisy-loading-spinner daisy-loading-sm" />
          ) : null}
          Execute
        </button>
      </div>
    </section>
  );
}

function ActionVariableInput({
  onChange,
  value,
  variable,
}: {
  onChange: (value: string | boolean) => void;
  value: string | boolean;
  variable: ActionVariable;
}) {
  const inputType = getInputType(variable);
  const placeholder = getPlaceholder(variable);

  if (variable.type === "bool") {
    return (
      <label className="flex items-center gap-3 rounded-lg border border-base-300 p-3">
        <input
          checked={value === true}
          className="daisy-checkbox"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-medium">{variable.label}</span>
          {variable.description ? (
            <span className="block text-xs text-base-content/60">
              {variable.description}
            </span>
          ) : null}
        </span>
      </label>
    );
  }

  return (
    <label className="daisy-form-control">
      <span className="daisy-label pb-2">
        <span className="daisy-label-text font-medium">{variable.label}</span>
      </span>
      <input
        aria-label={variable.label}
        className="daisy-input daisy-input-bordered w-full font-mono"
        inputMode={inputType === "number" ? "decimal" : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={String(value)}
      />
      {variable.description ? (
        <span className="daisy-label pt-2">
          <span className="daisy-label-text-alt text-base-content/60">
            {variable.description}
          </span>
        </span>
      ) : null}
      <details className="mt-2 rounded-lg bg-base-200 px-3 py-2 text-xs text-base-content/70">
        <summary className="cursor-pointer font-medium">
          Show technical name
        </summary>
        <div className="mt-2 grid gap-1">
          <div>
            Internal name:{" "}
            <span className="font-mono text-base-content">{variable.name}</span>
          </div>
          <div>
            Contract parameter type:{" "}
            <span className="font-mono text-base-content">{variable.type}</span>
          </div>
        </div>
      </details>
    </label>
  );
}

function ExecutionPreview({
  definition,
  preparation,
  preview,
  transactionHash,
  writeError,
}: {
  definition: ActionDefinitionV1;
  preparation: ReturnType<typeof prepareCommissionCall>;
  preview: ReturnType<typeof previewCommissionCall>;
  transactionHash: `0x${string}` | undefined;
  writeError: Error | null;
}) {
  if (!preview.success) {
    return (
      <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{preview.issues[0]?.message}</span>
      </div>
    );
  }

  const commissionSymbol =
    definition.commissionToken.kind === "eth"
      ? "ETH"
      : (definition.commissionToken.symbol ?? "tokens");
  const commissionDecimals =
    definition.commissionToken.kind === "eth"
      ? 18
      : (definition.commissionToken.decimals ?? 18);

  return (
    <div className="grid gap-3 rounded-lg bg-base-200 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-base-content/70">App fee</span>
        <span className="font-mono">
          {formatUnits(preview.preview.commission, commissionDecimals)}{" "}
          {commissionSymbol}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-base-content/70">Total ETH sent</span>
        <span className="font-mono">
          {formatUnits(preview.preview.totalEthValue, 18)} ETH
        </span>
      </div>
      {!preparation.success && preparation.issues[0]?.path !== "permit2" ? (
        <div className="flex gap-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>{preparation.issues[0]?.message}</span>
        </div>
      ) : null}
      {transactionHash ? (
        <div className="break-all text-xs text-base-content/70">
          Transaction: <span className="font-mono">{transactionHash}</span>
        </div>
      ) : null}
      {writeError ? (
        <div className="text-xs text-error">{writeError.message}</div>
      ) : null}
    </div>
  );
}

function getInputType(variable: ActionVariable): "number" | "text" {
  if (variable.unit?.kind === "eth" || variable.unit?.kind === "erc20") {
    return "number";
  }

  if (variable.type.startsWith("uint") || variable.type.startsWith("int")) {
    return "number";
  }

  return "text";
}

function getPlaceholder(variable: ActionVariable): string {
  if (variable.unit?.kind === "eth") {
    return `Amount in ${variable.unit.symbol ?? "ETH"}`;
  }

  if (variable.unit?.kind === "erc20") {
    return `Amount in ${variable.unit.symbol ?? "token units"}`;
  }

  if (variable.type === "address") {
    return "0x...";
  }

  return variable.type;
}

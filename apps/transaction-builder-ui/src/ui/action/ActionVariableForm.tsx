import type {
  ActionDefinitionV1,
  ActionVariable,
} from "@transaction-builder/domain";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getChainConfig } from "@transaction-builder/commissionroad-protocol";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import classNames from "classnames";
import { AlertTriangle } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { isSweepErc20RecipientVariable } from "./actionVariableDefaults";
import { ConnectedWalletBadge } from "./ConnectedWalletBadge";
import { getFixedSweepErc20TokenAddress } from "src/ui/token/sweepToken";
import { useTokenMetadata } from "src/ui/token/useTokenMetadata";

const ETH_MAX_GAS_RESERVE = parseUnits("0.0001", 18);

export function ActionVariableForm({
  allowlistStatus,
  className,
  definition,
  rawValues,
  setRawValues,
  variables,
}: {
  allowlistStatus: AllowlistStatus;
  className?: string;
  definition: ActionDefinitionV1;
  rawValues: RawActionVariableValues;
  setRawValues: Dispatch<SetStateAction<RawActionVariableValues>>;
  variables: ActionVariable[];
}) {
  const { isConnected } = useAccount();
  const connectedChainId = useChainId();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: definition.chainId });
  const { openConnectModal } = useConnectModal();
  const { isPending: isSwitchingChain, switchChain } = useSwitchChain();
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
  const celebratedTransactionHash = useRef<`0x${string}` | undefined>(
    undefined,
  );
  const isAllowlistBlocked = isAllowlistBlocking(allowlistStatus);
  const isAllowlistLoading = isAllowlistPending(allowlistStatus);
  const hasBlockingPreparationIssue =
    !prepared.success && prepared.issues[0]?.path !== "permit2";
  const isWrongNetwork = isConnected && connectedChainId !== definition.chainId;
  const actionChain = getChainConfig(definition.chainId);

  useEffect(() => {
    if (!writeError) {
      return;
    }

    toast.error(getWriteErrorToastMessage(writeError));
  }, [writeError]);

  useEffect(() => {
    if (
      !hash ||
      !receipt.isSuccess ||
      receipt.data?.status !== "success" ||
      celebratedTransactionHash.current === hash
    ) {
      return;
    }

    celebratedTransactionHash.current = hash;
    toast.success("Tx succeeded");
    fireTransactionSuccessConfetti();
    void queryClient.invalidateQueries({
      predicate: (query) => isBalanceRelatedQueryKey(query.queryKey),
    });
  }, [hash, queryClient, receipt.data?.status, receipt.isSuccess]);

  const handleExecute = () => {
    if (isAllowlistBlocked || isAllowlistLoading) {
      return;
    }

    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (isWrongNetwork) {
      switchChain({ chainId: definition.chainId });
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
    <section
      aria-label="Action inputs"
      className={classNames(
        "daisy-card min-w-0 max-w-full border border-base-300 bg-base-100 shadow-sm",
        className,
      )}
    >
      <div className="daisy-card-body gap-4">
        {variables.length ? (
          <form className="grid gap-4">
            {variables.map((variable) => (
              <ActionVariableInput
                definition={definition}
                key={variable.name}
                onChange={(value) =>
                  setRawValues((current) => ({
                    ...current,
                    [variable.name]: value,
                  }))
                }
                rawValues={rawValues}
                variables={variables}
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
          publicClient={publicClient}
          rawValues={rawValues}
          transactionHash={hash}
          variables={variables}
        />
        <ExecutionChecklist preflight={permit2Preflight} />

        <button
          className={classNames(
            "daisy-btn w-full",
            isWrongNetwork ? "daisy-btn-warning" : "daisy-btn-primary",
          )}
          disabled={
            isWrongNetwork
              ? isSwitchingChain
              : isPending ||
                receipt.isLoading ||
                isAllowlistBlocked ||
                isAllowlistLoading ||
                !preview.success ||
                hasBlockingPreparationIssue ||
                (permit2Preflight.kind === "erc20" &&
                  !permit2Preflight.canExecute)
          }
          onClick={handleExecute}
          type="button"
        >
          {isPending || receipt.isLoading || isSwitchingChain ? (
            <span className="daisy-loading daisy-loading-spinner daisy-loading-sm" />
          ) : null}
          {isWrongNetwork && !isSwitchingChain ? (
            <AlertTriangle className="size-4" />
          ) : null}
          {isWrongNetwork ? `Switch to ${actionChain.displayName}` : "Execute"}
        </button>
      </div>
    </section>
  );
}

function ActionVariableInput({
  definition,
  onChange,
  rawValues,
  variables,
  value,
  variable,
}: {
  definition: ActionDefinitionV1;
  onChange: (value: string | boolean) => void;
  rawValues: RawActionVariableValues;
  variables: ActionVariable[];
  value: string | boolean;
  variable: ActionVariable;
}) {
  const { address, isConnected } = useAccount();
  const inputType = getInputType(variable);
  const isEthAmount = variable.unit?.kind === "eth";
  const placeholder = getPlaceholder(variable);
  const balance = useBalance({
    address,
    chainId: definition.chainId,
    query: { enabled: isEthAmount && Boolean(address) },
  });
  const maxEthValue = useMemo(() => {
    if (!isEthAmount || balance.data?.value === undefined) {
      return undefined;
    }

    return getMaxEthVariableValue({
      balance: balance.data.value,
      definition,
      rawValues,
      variables,
      variable,
    });
  }, [
    balance.data?.value,
    definition,
    isEthAmount,
    rawValues,
    variable,
    variables,
  ]);
  const maxEthDisplay =
    maxEthValue === undefined
      ? undefined
      : formatUnits(maxEthValue, variable.unit?.decimals ?? 18);
  const balanceLabel = isEthAmount
    ? getEthBalanceLabel({
        balance: balance.data?.value,
        isConnected,
        isLoading: balance.isLoading,
      })
    : undefined;
  const connectedRecipientLabel =
    variable.type === "address" &&
    isConnected &&
    address &&
    isSweepErc20RecipientVariable(definition, variable.name) &&
    typeof value === "string" &&
    value.toLowerCase() === address.toLowerCase()
      ? "Connected wallet"
      : undefined;

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
    <div className="daisy-form-control">
      <span className="daisy-label flex items-center justify-between gap-3 pb-2">
        <span className="daisy-label-text font-medium">{variable.label}</span>
        {balanceLabel ? (
          <span className="daisy-label-text-alt min-w-0 truncate text-right text-base-content/60">
            {balanceLabel}
          </span>
        ) : null}
      </span>
      {isEthAmount ? (
        <div className="daisy-join w-full">
          <input
            aria-label={variable.label}
            className="daisy-input daisy-input-bordered daisy-join-item min-w-0 flex-1 rounded-r-none border-r-0 focus:z-10"
            inputMode={inputType === "number" ? "decimal" : undefined}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            type="text"
            value={String(value)}
          />
          <button
            className="daisy-btn daisy-join-item rounded-l-none border border-base-300 border-l-0 bg-base-100 px-4 text-neutral hover:border-base-300 hover:bg-base-200"
            disabled={maxEthDisplay === undefined}
            onClick={() => {
              if (maxEthDisplay !== undefined) {
                onChange(maxEthDisplay);
              }
            }}
            type="button"
          >
            Max
          </button>
        </div>
      ) : connectedRecipientLabel ? (
        <div className="relative">
          <input
            aria-label={variable.label}
            className="daisy-input daisy-input-bordered w-full pr-40"
            inputMode={inputType === "number" ? "decimal" : undefined}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            type="text"
            value={String(value)}
          />
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ConnectedWalletBadge />
          </div>
        </div>
      ) : (
        <input
          aria-label={variable.label}
          className="daisy-input daisy-input-bordered w-full"
          inputMode={inputType === "number" ? "decimal" : undefined}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={String(value)}
        />
      )}
      {variable.description ? (
        <span className="daisy-label pt-2">
          <span className="daisy-label-text-alt text-base-content/60">
            {variable.description}
          </span>
        </span>
      ) : null}
    </div>
  );
}

function ExecutionPreview({
  definition,
  preparation,
  preview,
  publicClient,
  rawValues,
  transactionHash,
  variables,
}: {
  definition: ActionDefinitionV1;
  preparation: ReturnType<typeof prepareCommissionCall>;
  preview: ReturnType<typeof previewCommissionCall>;
  publicClient: ReturnType<typeof usePublicClient>;
  rawValues: RawActionVariableValues;
  transactionHash: `0x${string}` | undefined;
  variables: ActionVariable[];
}) {
  const { address } = useAccount();
  const [gasCost, setGasCost] = useState<bigint | undefined>();
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [amountMode, setAmountMode] = useState<"crypto" | "fiat">("crypto");
  const ethUsdPrice = useEthUsdPrice();
  const sweepTokenAddress = useMemo(() => {
    const sweepStep = definition.steps.find(
      (step) => step.kind === "sweepErc20",
    );
    return sweepStep ? getFixedSweepErc20TokenAddress(sweepStep) : undefined;
  }, [definition]);
  const sweepTokenMetadata = useTokenMetadata({
    address: sweepTokenAddress,
    chainId: definition.chainId,
  });
  const receiveEstimate = useMemo(() => {
    if (!preview.success) {
      return undefined;
    }

    const sourceStep = definition.steps.find(
      (step) => step.callValue?.kind === "actionVariable",
    );
    const callValue = sourceStep?.callValue;
    if (
      !sourceStep ||
      gasCost === undefined ||
      callValue?.kind !== "actionVariable"
    ) {
      return undefined;
    }

    const sourceVariable = variables.find(
      (variable) => variable.name === callValue.name,
    );
    const sourceAmount = parseVariableBigIntValue(
      sourceVariable,
      rawValues[callValue.name],
    );
    if (sourceAmount === undefined) {
      return undefined;
    }

    const appFee =
      definition.commissionToken.kind === "eth"
        ? preview.preview.commission
        : 0n;
    const receiveAmount = sourceAmount - gasCost - appFee;
    return receiveAmount > 0n ? receiveAmount : 0n;
  }, [definition, gasCost, preview, rawValues, variables]);

  useEffect(() => {
    let active = true;
    const client = publicClient;

    if (!preparation.success || !address || !client) {
      setGasCost(undefined);
      setIsEstimatingGas(false);
      return () => {
        active = false;
      };
    }

    setIsEstimatingGas(true);
    void (async () => {
      try {
        const [estimatedGas, gasPrice] = await Promise.all([
          client.estimateContractGas({
            account: address,
            address: preparation.prepared.address,
            abi: preparation.prepared.abi,
            args: preparation.prepared.args,
            functionName: preparation.prepared.functionName,
            value: preparation.prepared.value,
          }),
          client.getGasPrice(),
        ]);

        if (active) {
          setGasCost(estimatedGas * gasPrice);
        }
      } catch {
        if (active) {
          setGasCost(undefined);
        }
      } finally {
        if (active) {
          setIsEstimatingGas(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [address, preparation, publicClient]);

  if (!preview.success) {
    const visibleIssue = getVisiblePreviewIssue(preview.issues, rawValues);
    if (!visibleIssue) {
      return null;
    }

    return (
      <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{visibleIssue.message}</span>
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
  const receiveSymbol =
    sweepTokenMetadata.metadata?.symbol ??
    (sweepTokenMetadata.isLoading ? "..." : "token");
  const receiveDecimals = sweepTokenMetadata.metadata?.decimals ?? 18;

  return (
    <div className="grid gap-y-4 py-2 text-sm md:grid-cols-3 md:gap-x-8">
      <PreviewMetric
        amountMode={amountMode}
        label="Gas cost"
        onToggleAmountMode={() =>
          setAmountMode((current) => (current === "crypto" ? "fiat" : "crypto"))
        }
        value={
          gasCost !== undefined ? (
            formatPreviewAmount({
              amount: gasCost,
              cryptoSymbol: "ETH",
              decimals: 18,
              mode: amountMode,
              usdPrice: ethUsdPrice.data,
            })
          ) : (
            <span className="text-base-content/45">
              {isEstimatingGas ? "Calculating..." : "Unavailable"}
            </span>
          )
        }
      />
      <PreviewMetric
        amountMode={amountMode}
        label="App fee"
        onToggleAmountMode={() =>
          setAmountMode((current) => (current === "crypto" ? "fiat" : "crypto"))
        }
        value={formatPreviewAmount({
          amount: preview.preview.commission,
          cryptoSymbol: commissionSymbol,
          decimals: commissionDecimals,
          mode: amountMode,
          usdPrice:
            definition.commissionToken.kind === "eth"
              ? ethUsdPrice.data
              : undefined,
        })}
      />
      <PreviewMetric
        label="You receive"
        value={
          receiveEstimate !== undefined ? (
            formatPreviewAmount({
              amount: receiveEstimate,
              cryptoSymbol: receiveSymbol,
              decimals: receiveDecimals,
              mode: "crypto",
              usdPrice: undefined,
            })
          ) : (
            <span className="text-base-content/45">
              {sweepTokenMetadata.isLoading ? "Loading..." : "Unavailable"}
            </span>
          )
        }
      />
      {!preparation.success && preparation.issues[0]?.path !== "permit2" ? (
        <div className="col-span-full flex gap-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>{preparation.issues[0]?.message}</span>
        </div>
      ) : null}
      {transactionHash ? (
        <div className="col-span-full break-all text-xs text-base-content/70">
          Transaction: <span>{transactionHash}</span>
        </div>
      ) : null}
    </div>
  );
}

function PreviewMetric({
  amountMode,
  label,
  onToggleAmountMode,
  value,
}: {
  amountMode?: "crypto" | "fiat";
  label: string;
  onToggleAmountMode?: () => void;
  value: React.ReactNode;
}) {
  const content = (
    <>
      <div className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
        {label}
      </div>
      <div className="min-w-0 text-base font-semibold leading-snug text-neutral">
        {value}
      </div>
    </>
  );

  if (!amountMode || !onToggleAmountMode) {
    return (
      <div className="grid min-w-0 gap-1 border-t border-base-200 pt-4 first:border-t-0 first:pt-0 md:border-l md:border-t-0 md:pl-8 md:pt-0 md:first:border-l-0 md:first:pl-0">
        {content}
      </div>
    );
  }

  return (
    <button
      aria-label={`Show ${amountMode === "crypto" ? "fiat" : "crypto"} value for ${label}`}
      className="grid min-w-0 gap-1 border-t border-base-200 pt-4 text-left first:border-t-0 first:pt-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:border-l md:border-t-0 md:pl-8 md:pt-0 md:first:border-l-0 md:first:pl-0"
      onClick={onToggleAmountMode}
      type="button"
    >
      {content}
    </button>
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

function getEthBalanceLabel({
  balance,
  isConnected,
  isLoading,
}: {
  balance: bigint | undefined;
  isConnected: boolean;
  isLoading: boolean;
}): string {
  if (!isConnected) {
    return "Balance unavailable";
  }

  if (isLoading) {
    return "Loading balance";
  }

  if (balance === undefined) {
    return "Balance unavailable";
  }

  return `Balance ${formatDisplayAmount(balance, 18)} ETH`;
}

function getMaxEthVariableValue({
  balance,
  definition,
  rawValues,
  variables,
  variable,
}: {
  balance: bigint;
  definition: ActionDefinitionV1;
  rawValues: RawActionVariableValues;
  variables: ActionVariable[];
  variable: ActionVariable;
}): bigint | undefined {
  let fixedEthCost = 0n;
  let targetVariableUses = 0n;

  for (const step of definition.steps) {
    const callValue = step.callValue;
    if (!callValue) {
      continue;
    }

    if (callValue.kind === "fixed") {
      fixedEthCost += BigInt(String(callValue.value || "0"));
      continue;
    }

    if (callValue.kind === "stepOutput") {
      return undefined;
    }

    if (callValue.name === variable.name) {
      targetVariableUses += 1n;
      continue;
    }

    const referencedVariable = variables.find(
      (candidate) => candidate.name === callValue.name,
    );
    const parsedValue = parseVariableBigIntValue(
      referencedVariable,
      rawValues[callValue.name],
    );
    if (parsedValue === undefined) {
      return undefined;
    }

    fixedEthCost += parsedValue;
  }

  let targetCommissionBps = 0n;
  if (definition.commissionToken.kind === "eth") {
    const commissionFormula = definition.commissionFormula;
    if (commissionFormula.kind === "flat") {
      fixedEthCost += parseUnits(commissionFormula.amount, 18);
    } else if (commissionFormula.variable === variable.name) {
      targetCommissionBps = BigInt(commissionFormula.bps);
    } else {
      const sourceVariable = variables.find(
        (candidate) => candidate.name === commissionFormula.variable,
      );
      const parsedSource = parseVariableBigIntValue(
        sourceVariable,
        rawValues[commissionFormula.variable],
      );
      if (parsedSource === undefined) {
        return undefined;
      }

      fixedEthCost += (parsedSource * BigInt(commissionFormula.bps)) / 10_000n;
    }
  }

  const available = balance - fixedEthCost - ETH_MAX_GAS_RESERVE;
  if (available <= 0n) {
    return 0n;
  }

  const denominator = targetVariableUses * 10_000n + targetCommissionBps;
  if (denominator <= 0n) {
    return undefined;
  }

  return (available * 10_000n) / denominator;
}

function parseVariableBigIntValue(
  variable: ActionVariable | undefined,
  rawValue: string | boolean | undefined,
): bigint | undefined {
  if (!variable || rawValue === undefined || rawValue === "") {
    return undefined;
  }

  try {
    if (variable.unit?.kind === "eth" || variable.unit?.kind === "erc20") {
      return parseUnits(String(rawValue), variable.unit.decimals ?? 18);
    }

    return BigInt(String(rawValue));
  } catch {
    return undefined;
  }
}

function formatDisplayAmount(value: bigint, decimals: number): string {
  const formatted = formatUnits(value, decimals);
  const [whole, fraction] = formatted.split(".");
  if (!fraction) {
    return formatted;
  }

  const trimmedFraction = fraction.replace(/0+$/, "");
  if (!trimmedFraction) {
    return whole ?? "0";
  }

  return `${whole ?? "0"}.${trimmedFraction.slice(0, 6)}`;
}

function getVisiblePreviewIssue(
  issues: Array<{ message: string; path: string }>,
  rawValues: RawActionVariableValues,
): { message: string; path: string } | undefined {
  return issues.find((issue) => {
    const variableName = issue.path.startsWith("variables.")
      ? issue.path.slice("variables.".length)
      : undefined;

    if (
      variableName &&
      issue.message.endsWith(" is required.") &&
      (rawValues[variableName] === undefined || rawValues[variableName] === "")
    ) {
      return false;
    }

    return true;
  });
}

function formatPreviewAmount({
  amount,
  cryptoSymbol,
  decimals,
  mode,
  usdPrice,
}: {
  amount: bigint;
  cryptoSymbol: string;
  decimals: number;
  mode: "crypto" | "fiat";
  usdPrice: number | undefined;
}): string {
  if (mode === "fiat" && usdPrice !== undefined) {
    const numericAmount = Number(formatUnits(amount, decimals));
    return formatUsd(numericAmount * usdPrice);
  }

  return `${formatDisplayAmount(amount, decimals)} ${cryptoSymbol}`;
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function fireTransactionSuccessConfetti() {
  const defaults = {
    disableForReducedMotion: true,
    ticks: 220,
    zIndex: 9999,
  } satisfies confetti.Options;

  void confetti({
    ...defaults,
    particleCount: 140,
    spread: 95,
    startVelocity: 58,
    origin: { x: 0.5, y: 0.58 },
  });
  window.setTimeout(() => {
    void confetti({
      ...defaults,
      angle: 60,
      particleCount: 80,
      spread: 70,
      startVelocity: 48,
      origin: { x: 0.08, y: 0.7 },
    });
    void confetti({
      ...defaults,
      angle: 120,
      particleCount: 80,
      spread: 70,
      startVelocity: 48,
      origin: { x: 0.92, y: 0.7 },
    });
  }, 140);
}

function isBalanceRelatedQueryKey(queryKey: readonly unknown[]): boolean {
  const serializedQueryKey = JSON.stringify(queryKey).toLowerCase();
  return (
    serializedQueryKey.includes("balance") ||
    serializedQueryKey.includes("readcontract")
  );
}

function useEthUsdPrice() {
  return useQuery({
    queryKey: ["eth-usd-price"],
    queryFn: async () => {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      );

      if (!response.ok) {
        throw new Error("ETH price unavailable");
      }

      const body = (await response.json()) as {
        ethereum?: { usd?: number };
      };
      const price = body.ethereum?.usd;
      if (typeof price !== "number") {
        throw new Error("ETH price unavailable");
      }

      return price;
    },
    retry: false,
    staleTime: 60_000,
  });
}

function getWriteErrorToastMessage(error: Error): string {
  const errorWithDetails = error as Error & {
    shortMessage?: string;
  };
  const searchText = [error.name, errorWithDetails.shortMessage, error.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    searchText.includes("user rejected") ||
    searchText.includes("user denied") ||
    searchText.includes("rejected the request") ||
    searchText.includes("denied transaction signature")
  ) {
    return "User rejected transaction";
  }

  return errorWithDetails.shortMessage || "Transaction failed";
}

import {
  type Address,
  type ActionDefinitionV1,
  type ActionVariable,
  type SupportedActionChainId,
} from "@transaction-builder/domain";
import { getExplorerConfig } from "@transaction-builder/commissionroad-protocol";
import { ChevronDown, ExternalLink } from "lucide-react";
import { getExecutableActionVariables } from "src/transactions/commissionCall";
import type { RawActionVariableValues } from "src/transactions/commissionCall";
import { ConnectedWalletBadge } from "./ConnectedWalletBadge";
import { Erc20TokenIdentity } from "src/ui/token/Erc20TokenIdentity";
import { getFixedSweepErc20TokenAddress } from "src/ui/token/sweepToken";
import { useTokenMetadata } from "src/ui/token/useTokenMetadata";
import { isAddress } from "viem";
import { useAccount } from "wagmi";

export function TechnicalDetailsPanel({
  definition,
  presentation = "card",
  rawValues,
}: {
  definition: ActionDefinitionV1;
  presentation?: "accordion" | "card";
  rawValues: RawActionVariableValues;
}) {
  const variables = getExecutableActionVariables(definition);
  const body = (
    <TechnicalDetailsBody
      definition={definition}
      rawValues={rawValues}
      variables={variables}
    />
  );

  if (presentation === "accordion") {
    return (
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-3 py-3 text-2xl font-semibold text-neutral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          <span>Technical Details</span>
          <ChevronDown className="size-5 shrink-0 text-base-content/50 transition group-open:rotate-180" />
        </summary>
        <div className="pt-3">{body}</div>
      </details>
    );
  }

  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-5">
        <div>
          <h2 className="text-lg font-semibold">Technical Details</h2>
        </div>

        {body}
      </div>
    </section>
  );
}

function TechnicalDetailsBody({
  definition,
  rawValues,
  variables,
}: {
  definition: ActionDefinitionV1;
  rawValues: RawActionVariableValues;
  variables: ActionVariable[];
}) {
  const { address: connectedAddress, isConnected } = useAccount();
  const variablesByName = new Map(
    variables.map((variable) => [variable.name, variable]),
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/50">
          Flow
        </h3>
        <ol className="grid gap-3">
          {definition.steps.map((step, index) => {
            const contract = definition.contracts.find(
              (candidate) => candidate.id === step.contractId,
            );
            const targetLabel =
              contract?.labels.verified ||
              contract?.labels.creator ||
              step.target;
            const targetShort = shortenAddress(step.target);
            const sweepTokenAddress = getFixedSweepErc20TokenAddress(step);

            return (
              <li
                className="grid gap-3 rounded-lg border border-base-300 bg-base-100 px-4 py-4 shadow-sm"
                key={step.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
                      Step {index + 1}
                    </div>
                    <div className="mt-1 break-words text-base font-semibold text-neutral">
                      {contract?.labels.verified ||
                        contract?.labels.creator ||
                        shortenAddress(step.target)}{" "}
                      <span className="text-base-content/50">
                        {step.functionSignature}
                      </span>
                    </div>
                  </div>
                  <a
                    className="grid min-w-0 max-w-[18rem] gap-1 rounded-lg border border-base-300 bg-base-200 px-3 py-3 text-xs text-base-content/70 transition hover:border-secondary/40 hover:bg-secondary/5 hover:text-base-content"
                    href={getExplorerTargetUrl({
                      chainId: definition.chainId,
                      address: step.target,
                    })}
                    rel="noreferrer"
                    target="_blank"
                    title={`Open ${step.target} in ${getExplorerConfig(definition.chainId).name}`}
                  >
                    <span className="flex items-center justify-between gap-2 font-semibold uppercase tracking-wide text-base-content/45">
                      <span>Target</span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </span>
                    <span className="min-w-0 truncate text-[11px] text-neutral">
                      {targetLabel} · {targetShort}
                    </span>
                  </a>
                </div>

                <div className="grid gap-2">
                  {step.parameters.map((binding, bindingIndex) => {
                    const input = step.inputs[bindingIndex];
                    const inputName = input?.name || `arg${bindingIndex}`;
                    return (
                      <div
                        className="flex items-start justify-between gap-3 rounded-lg bg-base-200 px-3 py-2 text-sm"
                        key={`${step.id}-${bindingIndex}`}
                      >
                        <span className="min-w-0 text-base-content/60">
                          {inputName}
                        </span>
                        <TechnicalParameterValue
                          binding={binding}
                          chainId={definition.chainId}
                          connectedAddress={
                            isConnected ? connectedAddress : undefined
                          }
                          rawValues={rawValues}
                          step={step}
                          variablesByName={variablesByName}
                        />
                      </div>
                    );
                  })}

                  {step.callValue ? (
                    <div className="flex items-start justify-between gap-3 rounded-lg bg-base-200 px-3 py-2 text-sm">
                      <span className="min-w-0 text-base-content/60">
                        Eth value
                      </span>
                      <span className="max-w-[65%] break-words text-right text-neutral">
                        {formatBindingValue({
                          binding: step.callValue,
                          rawValues,
                          variablesByName,
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>

                {sweepTokenAddress ? (
                  <Erc20TokenIdentity
                    address={sweepTokenAddress}
                    chainId={definition.chainId}
                    className="border-t border-base-300 pt-3"
                    label="Recipient receives all available balance of"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      {variables.length ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/50">
            Action Inputs
          </h3>
          <ul className="grid gap-2">
            {variables.map((variable) => {
              const value = rawValues[variable.name];
              return (
                <li
                  className="rounded-lg border border-base-300 bg-base-100 px-4 py-4 shadow-sm"
                  key={variable.name}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-neutral">
                        {variable.label}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-base-content/60">
                        <span>
                          Name:{" "}
                          <span className="text-base-content">
                            {variable.name}
                          </span>
                        </span>
                        <span>
                          Type:{" "}
                          <span className="text-base-content">
                            {variable.type}
                          </span>
                        </span>
                        {variable.unit ? (
                          <span>{formatVariableUnit(variable)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="max-w-[50%] text-right">
                      <div className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
                        Provided
                      </div>
                      <TechnicalProvidedValue
                        connectedAddress={
                          isConnected ? connectedAddress : undefined
                        }
                        value={formatProvidedValue(variable, value)}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <details className="rounded-lg border border-base-300 bg-neutral px-4 py-4 text-white shadow-sm">
        <summary className="cursor-pointer text-sm font-medium">
          Action Definition JSON
        </summary>
        <pre className="mt-3 max-h-80 overflow-auto text-xs">
          <code>{JSON.stringify(definition, null, 2)}</code>
        </pre>
      </details>
    </div>
  );
}

function TechnicalParameterValue({
  binding,
  chainId,
  connectedAddress,
  rawValues,
  step,
  variablesByName,
}: {
  binding: ActionDefinitionV1["steps"][number]["parameters"][number];
  chainId: SupportedActionChainId;
  connectedAddress: string | undefined;
  rawValues: RawActionVariableValues;
  step: ActionDefinitionV1["steps"][number];
  variablesByName: Map<string, ActionVariable>;
}) {
  const value = formatBindingValue({
    binding,
    rawValues,
    variablesByName,
  });
  const sweepTokenAddress = getFixedSweepErc20TokenAddress(step);
  const isSweepTokenValue =
    sweepTokenAddress &&
    isAddress(value) &&
    value.toLowerCase() === sweepTokenAddress.toLowerCase();

  if (isSweepTokenValue) {
    return (
      <SweepTokenAddressValue address={sweepTokenAddress} chainId={chainId} />
    );
  }

  return (
    <TechnicalValueWithWalletBadge
      connectedAddress={connectedAddress}
      value={value}
    />
  );
}

function TechnicalProvidedValue({
  connectedAddress,
  value,
}: {
  connectedAddress: string | undefined;
  value: string;
}) {
  return (
    <div className="mt-1">
      <TechnicalValueWithWalletBadge
        className="max-w-full"
        connectedAddress={connectedAddress}
        value={value}
      />
    </div>
  );
}

function TechnicalValueWithWalletBadge({
  className = "max-w-[65%]",
  connectedAddress,
  value,
}: {
  className?: string;
  connectedAddress: string | undefined;
  value: string;
}) {
  const isConnectedWallet =
    connectedAddress && value.toLowerCase() === connectedAddress.toLowerCase();

  return (
    <span
      className={`${className} inline-flex flex-wrap items-center justify-end gap-2 break-words text-right text-sm text-neutral`}
    >
      <span className="break-words">{value}</span>
      {isConnectedWallet ? <ConnectedWalletBadge /> : null}
    </span>
  );
}

function SweepTokenAddressValue({
  address,
  chainId,
}: {
  address: Address;
  chainId: SupportedActionChainId;
}) {
  const tokenMetadata = useTokenMetadata({ address, chainId });
  const explorer = getExplorerConfig(chainId);
  const symbol = tokenMetadata.metadata?.symbol;

  return (
    <span className="inline-flex max-w-[65%] flex-wrap items-center justify-end gap-2 text-right text-sm text-neutral">
      {symbol ? (
        <span className="rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-[10px] font-semibold text-base-content/70">
          {symbol}
        </span>
      ) : tokenMetadata.isLoading ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-base-content/40">
          Loading token
        </span>
      ) : null}
      <a
        className="min-w-0 break-all underline decoration-base-content/20 underline-offset-2 transition hover:text-base-content hover:decoration-base-content/50"
        href={`${explorer.browserUrl}/address/${address}`}
        rel="noreferrer"
        target="_blank"
        title={`Open ${address} in ${explorer.name}`}
      >
        {address}
      </a>
    </span>
  );
}

function formatBindingValue({
  binding,
  rawValues,
  variablesByName,
}: {
  binding:
    | ActionDefinitionV1["steps"][number]["parameters"][number]
    | ActionDefinitionV1["steps"][number]["callValue"];
  rawValues: RawActionVariableValues;
  variablesByName: Map<string, ActionVariable>;
}): string {
  if (!binding) {
    return "—";
  }

  if (binding.kind === "fixed") {
    return typeof binding.value === "string"
      ? binding.value
      : JSON.stringify(binding.value);
  }

  if (binding.kind === "stepOutput") {
    return `Step ${binding.stepId} output ${binding.outputIndex}`;
  }

  const variable = variablesByName.get(binding.name);
  return formatProvidedValue(variable, rawValues[binding.name]);
}

function formatProvidedValue(
  variable: ActionVariable | undefined,
  value: string | boolean | undefined,
): string {
  if (value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (variable?.unit?.kind === "eth") {
    return `${value} ${variable.unit.symbol ?? "ETH"}`;
  }

  if (variable?.unit?.kind === "erc20") {
    return `${value} ${variable.unit.symbol ?? "tokens"}`;
  }

  return value;
}

function formatVariableUnit(variable: ActionVariable): string {
  if (!variable.unit) {
    return "";
  }

  const symbol = variable.unit.symbol ? ` ${variable.unit.symbol}` : "";
  const decimals =
    variable.unit.decimals === undefined
      ? ""
      : `, ${variable.unit.decimals} decimals`;

  return `Unit: ${variable.unit.kind}${symbol}${decimals}`;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getExplorerTargetUrl({
  address,
  chainId,
}: {
  address: string;
  chainId: ActionDefinitionV1["chainId"];
}): string {
  const explorer = getExplorerConfig(chainId);
  return `${explorer.browserUrl}/address/${address}`;
}

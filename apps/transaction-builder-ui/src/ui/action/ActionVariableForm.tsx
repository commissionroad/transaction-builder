import type {
  ActionDefinitionV1,
  ActionVariable,
} from "@transaction-builder/domain";

export function ActionVariableForm({
  definition,
}: {
  definition: ActionDefinitionV1;
}) {
  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-4">
        <div>
          <h2 className="text-lg font-semibold">Action Inputs</h2>
          <p className="mt-1 text-sm text-base-content/70">
            These values fill the creator-selected Action Variables.
          </p>
        </div>

        {definition.variables.length ? (
          <form className="grid gap-4">
            {definition.variables.map((variable) => (
              <ActionVariableInput key={variable.name} variable={variable} />
            ))}
          </form>
        ) : (
          <div className="rounded-lg bg-base-200 p-4 text-sm text-base-content/70">
            This Action does not require any user-provided inputs.
          </div>
        )}

        <button className="daisy-btn daisy-btn-primary w-full" type="button">
          Execute
        </button>
      </div>
    </section>
  );
}

function ActionVariableInput({ variable }: { variable: ActionVariable }) {
  const inputType = getInputType(variable);
  const placeholder = getPlaceholder(variable);

  return (
    <label className="daisy-form-control">
      <span className="daisy-label pb-2">
        <span className="daisy-label-text font-medium">{variable.label}</span>
      </span>
      <input
        aria-label={variable.label}
        className="daisy-input daisy-input-bordered w-full font-mono"
        inputMode={inputType === "number" ? "decimal" : undefined}
        placeholder={placeholder}
        type="text"
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

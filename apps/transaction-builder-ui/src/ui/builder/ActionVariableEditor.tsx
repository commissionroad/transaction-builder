import type { ActionVariable } from "@transaction-builder/domain";
import { useEffect, useState } from "react";
import type { BuilderDraft } from "./builderState";

export function ActionVariableEditor({
  draft,
  mode = "expanded",
  onChange,
}: {
  draft: BuilderDraft;
  mode?: "expanded" | "accordion";
  onChange: (draft: BuilderDraft) => void;
}) {
  const [openVariableName, setOpenVariableName] = useState<string | null>(null);
  const updateVariable = (name: string, patch: Partial<ActionVariable>) => {
    onChange({
      ...draft,
      variables: draft.variables.map((variable) =>
        variable.name === name ? { ...variable, ...patch } : variable,
      ),
    });
  };

  useEffect(() => {
    if (mode === "accordion") {
      setOpenVariableName(null);
    }
  }, [mode]);

  useEffect(() => {
    if (
      openVariableName &&
      !draft.variables.some((variable) => variable.name === openVariableName)
    ) {
      setOpenVariableName(null);
    }
  }, [draft.variables, openVariableName]);

  if (!draft.variables.length) {
    return (
      <section className="rounded-lg border border-base-300 bg-base-100 p-3 text-sm text-base-content/70 shadow-sm">
        Mark Contract Parameters or Call Value as variable to ask users for
        those values.
      </section>
    );
  }

  if (mode === "accordion") {
    return (
      <section className="rounded-lg border border-base-300 bg-base-100 p-1 shadow-sm">
        <div className="grid gap-1">
          {draft.variables.map((variable) => {
            const isOpen = openVariableName === variable.name;

            return (
              <div
                className={`daisy-collapse daisy-collapse-arrow rounded-md bg-base-100 ${
                  isOpen ? "daisy-collapse-open" : "daisy-collapse-close"
                }`}
                key={variable.name}
              >
                <button
                  aria-expanded={isOpen}
                  className="daisy-collapse-title min-h-0 px-3 py-2 pr-10 text-left"
                  onClick={() =>
                    setOpenVariableName(isOpen ? null : variable.name)
                  }
                  type="button"
                >
                  <span className="block truncate text-sm font-semibold">
                    {variable.label || variable.name}
                  </span>
                  <span className="block truncate font-mono text-xs text-base-content/50">
                    {variable.name} · {variable.type}
                  </span>
                </button>
                {isOpen ? (
                  <div className="daisy-collapse-content px-3 pb-3">
                    <VariableFields
                      updateVariable={updateVariable}
                      variable={variable}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-3 shadow-sm">
      <div className="grid gap-3">
        {draft.variables.map((variable) => (
          <div className="rounded-lg bg-base-200 p-3" key={variable.name}>
            <VariableFields
              updateVariable={updateVariable}
              variable={variable}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function VariableFields({
  updateVariable,
  variable,
}: {
  updateVariable: (name: string, patch: Partial<ActionVariable>) => void;
  variable: ActionVariable;
}) {
  return (
    <>
      <div className="mb-2 font-mono text-xs text-base-content/60">
        Internal name: {variable.name}
      </div>
      <label className="daisy-form-control">
        <span className="daisy-label pb-1">
          <span className="daisy-label-text text-sm font-medium">
            Display label
          </span>
        </span>
        <input
          className="daisy-input daisy-input-bordered daisy-input-sm"
          value={variable.label}
          onChange={(event) =>
            updateVariable(variable.name, { label: event.target.value })
          }
        />
      </label>
      <label className="daisy-form-control mt-2">
        <span className="daisy-label pb-1">
          <span className="daisy-label-text text-sm font-medium">
            User help text
          </span>
        </span>
        <textarea
          className="daisy-textarea daisy-textarea-bordered daisy-textarea-sm"
          value={variable.description ?? ""}
          onChange={(event) =>
            updateVariable(variable.name, {
              description: event.target.value || undefined,
            })
          }
        />
      </label>
    </>
  );
}

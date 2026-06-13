import type { ActionVariable } from "@transaction-builder/domain";
import type { BuilderDraft } from "./builderState";

export function ActionVariableEditor({
  draft,
  onChange,
}: {
  draft: BuilderDraft;
  onChange: (draft: BuilderDraft) => void;
}) {
  const updateVariable = (name: string, patch: Partial<ActionVariable>) => {
    onChange({
      ...draft,
      variables: draft.variables.map((variable) =>
        variable.name === name ? { ...variable, ...patch } : variable,
      ),
    });
  };

  if (!draft.variables.length) {
    return (
      <section className="rounded-lg border border-base-300 bg-base-100 p-3 text-sm text-base-content/70 shadow-sm">
        Mark Contract Parameters or Call Value as variable to ask users for
        those values.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-3 shadow-sm">
      <div className="grid gap-3">
        {draft.variables.map((variable) => (
          <div className="rounded-lg bg-base-200 p-3" key={variable.name}>
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
          </div>
        ))}
      </div>
    </section>
  );
}

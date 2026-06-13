import type { BuilderDraft } from "./builderState";

export function CommissionEditor({
  draft,
  onChange,
}: {
  draft: BuilderDraft;
  onChange: (draft: BuilderDraft) => void;
}) {
  const percentageVariables = draft.variables.filter((variable) =>
    variable.type.startsWith("uint"),
  );
  const formulaKind = draft.commissionFormula.kind;
  const percentageFormula =
    draft.commissionFormula.kind === "percentage"
      ? draft.commissionFormula
      : undefined;

  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-4">
        <h2 className="text-lg font-semibold">Commission</h2>
        <label className="daisy-form-control">
          <span className="daisy-label pb-2">
            <span className="daisy-label-text font-medium">
              CommissionRoad NFT
            </span>
          </span>
          <input
            className="daisy-input daisy-input-bordered w-full"
            placeholder="NFT ID"
            value={draft.commissionRoadNftId ?? ""}
            onChange={(event) =>
              onChange({
                ...draft,
                commissionRoadNftId: event.target.value || undefined,
              })
            }
          />
        </label>

        <div>
          <div className="mb-2 text-sm font-medium">Commission token</div>
          <div className="daisy-join w-full">
            <button
              className="daisy-btn daisy-join-item daisy-btn-active flex-1"
              type="button"
            >
              ETH
            </button>
            <button
              className="daisy-btn daisy-join-item flex-1"
              disabled
              type="button"
            >
              ERC20
            </button>
          </div>
          <p className="mt-2 text-xs text-base-content/60">
            ERC20 commissions are coming in the Permit2 slice.
          </p>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Fee mode</div>
          <div className="daisy-join w-full">
            <button
              className={`daisy-btn daisy-join-item flex-1 ${formulaKind === "flat" ? "daisy-btn-active" : ""}`}
              onClick={() =>
                onChange({
                  ...draft,
                  commissionFormula: { kind: "flat", amount: "0" },
                })
              }
              type="button"
            >
              Flat
            </button>
            <button
              className={`daisy-btn daisy-join-item flex-1 ${formulaKind === "percentage" ? "daisy-btn-active" : ""}`}
              disabled={!percentageVariables.length}
              onClick={() =>
                onChange({
                  ...draft,
                  commissionFormula: {
                    kind: "percentage",
                    bps: 1,
                    variable: percentageVariables[0]?.name ?? "",
                  },
                })
              }
              type="button"
            >
              Percentage
            </button>
          </div>
        </div>

        {draft.commissionFormula.kind === "flat" ? (
          <label className="daisy-form-control">
            <span className="daisy-label pb-2">
              <span className="daisy-label-text font-medium">
                Flat fee in wei
              </span>
            </span>
            <input
              className="daisy-input daisy-input-bordered w-full font-mono"
              value={draft.commissionFormula.amount}
              onChange={(event) =>
                onChange({
                  ...draft,
                  commissionFormula: {
                    kind: "flat",
                    amount: event.target.value,
                  },
                })
              }
            />
          </label>
        ) : percentageFormula ? (
          <div className="grid gap-3">
            <label className="daisy-form-control">
              <span className="daisy-label pb-2">
                <span className="daisy-label-text font-medium">
                  Basis points
                </span>
              </span>
              <input
                className="daisy-input daisy-input-bordered w-full"
                min={1}
                type="number"
                value={percentageFormula.bps}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    commissionFormula: {
                      kind: "percentage",
                      variable: percentageFormula.variable,
                      bps: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="daisy-form-control">
              <span className="daisy-label pb-2">
                <span className="daisy-label-text font-medium">
                  Percentage of Action Variable
                </span>
              </span>
              <select
                className="daisy-select daisy-select-bordered w-full"
                value={percentageFormula.variable}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    commissionFormula: {
                      kind: "percentage",
                      bps: percentageFormula.bps,
                      variable: event.target.value,
                    },
                  })
                }
              >
                {percentageVariables.map((variable) => (
                  <option key={variable.name} value={variable.name}>
                    {variable.label} ({variable.name})
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}

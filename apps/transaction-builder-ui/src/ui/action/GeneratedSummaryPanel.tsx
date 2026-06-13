import {
  generateSummary,
  type ActionDefinitionV1,
} from "@transaction-builder/domain";

export function GeneratedSummaryPanel({
  definition,
}: {
  definition: ActionDefinitionV1;
}) {
  const summary = generateSummary(definition);

  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-4">
        <div>
          <h2 className="text-lg font-semibold">Generated Summary</h2>
          <p className="mt-1 text-sm text-base-content/70">
            {summary.overview}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/50">
            Key Effects
          </h3>
          <ul className="mt-2 grid gap-2">
            {summary.keyEffects.map((effect) => (
              <li
                className="rounded-lg bg-base-200 px-3 py-2 text-sm"
                key={effect}
              >
                {effect}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/50">
            Flow
          </h3>
          <ol className="mt-2 grid gap-2">
            {summary.steps.map((step) => (
              <li
                className="rounded-lg bg-base-200 px-3 py-2 text-sm"
                key={step}
              >
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

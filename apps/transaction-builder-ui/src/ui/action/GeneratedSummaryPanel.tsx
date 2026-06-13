import {
  generateSummary,
  type ActionDefinitionV1,
} from "@transaction-builder/domain";
import { Erc20TokenIdentity } from "src/ui/token/Erc20TokenIdentity";
import { getFixedSweepErc20TokenAddress } from "src/ui/token/sweepToken";

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
            {summary.steps.map((step, index) => {
              const sweepTokenAddress = getFixedSweepErc20TokenAddress(
                definition.steps[index],
              );

              return (
                <li
                  className="rounded-lg bg-base-200 px-3 py-2 text-sm"
                  key={step}
                >
                  {step}
                  {sweepTokenAddress ? (
                    <Erc20TokenIdentity
                      address={sweepTokenAddress}
                      chainId={definition.chainId}
                      className="mt-2 border-t border-base-300 pt-2"
                      label="Recipient receives"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

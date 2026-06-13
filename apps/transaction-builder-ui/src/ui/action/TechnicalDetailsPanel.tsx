import {
  getActionShape,
  getActionTargets,
  type ActionDefinitionV1,
} from "@transaction-builder/domain";
import { getChainConfig } from "@transaction-builder/commissionroad-protocol";

export function TechnicalDetailsPanel({
  definition,
  slug,
}: {
  definition: ActionDefinitionV1;
  slug: string;
}) {
  const chain = getChainConfig(definition.chainId);
  const targets = getActionTargets(definition);

  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-4">
        <h2 className="text-lg font-semibold">Technical Details</h2>

        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Share slug" value={slug} />
          <Detail
            label="Chain"
            value={`${chain.displayName} (${chain.chainId})`}
          />
          <Detail
            label="Action shape"
            value={
              getActionShape(definition) === "commissionPlan"
                ? "Commission Plan"
                : "Commission Call"
            }
          />
          <Detail
            label="CommissionRoad NFT"
            value={
              definition.commissionRoadNftId
                ? `#${definition.commissionRoadNftId}`
                : "Selected by creator"
            }
          />
        </dl>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/50">
            Contract Targets
          </h3>
          <ul className="mt-2 grid gap-2">
            {targets.map((target) => (
              <li
                className="break-all rounded-lg bg-base-200 px-3 py-2 font-mono text-xs"
                key={target}
              >
                {target}
              </li>
            ))}
          </ul>
        </div>

        <details className="rounded-lg bg-neutral p-4 text-white">
          <summary className="cursor-pointer text-sm font-medium">
            Action Definition JSON
          </summary>
          <pre className="mt-3 max-h-80 overflow-auto text-xs">
            <code>{JSON.stringify(definition, null, 2)}</code>
          </pre>
        </details>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-base-200 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-base-content/50">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-sm">{value}</dd>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { ActionNotFoundError, getPublishedAction } from "src/network/apiClient";
import { AllowlistNotice } from "src/ui/allowlist/AllowlistNotice";
import {
  useAllowlistStatus,
  type AllowlistStatus,
} from "src/ui/allowlist/useAllowlistStatus";
import { ActionVariableForm } from "./ActionVariableForm";
import { GeneratedSummaryPanel } from "./GeneratedSummaryPanel";
import { TechnicalDetailsPanel } from "./TechnicalDetailsPanel";

export function ActionPage({
  allowlistStatusOverride,
  slug,
}: {
  allowlistStatusOverride?: AllowlistStatus;
  slug: string;
}) {
  const actionQuery = useQuery({
    queryKey: ["published-action", slug],
    queryFn: () => getPublishedAction(slug),
    retry: false,
  });
  const action = actionQuery.data?.definition;
  const queriedAllowlistStatus = useAllowlistStatus(
    allowlistStatusOverride ? undefined : action,
  );
  const allowlistStatus = allowlistStatusOverride ?? queriedAllowlistStatus;

  if (actionQuery.isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-10">
        <div className="daisy-skeleton h-8 w-64" />
        <div className="daisy-skeleton h-32 w-full" />
      </main>
    );
  }

  if (actionQuery.isError) {
    const notFound = actionQuery.error instanceof ActionNotFoundError;
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
        <div className="rounded-lg border border-error/30 bg-error/10 p-5">
          <h1 className="text-2xl font-semibold">
            {notFound ? "Action not found" : "Action unavailable"}
          </h1>
          <p className="mt-2 text-sm text-base-content/70">
            {notFound
              ? "This share link does not match a Published Action."
              : "The Published Action could not be loaded right now."}
          </p>
        </div>
      </main>
    );
  }

  if (!action) {
    return null;
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-secondary">
            Published Action
          </p>
          <h1 className="text-3xl font-semibold text-neutral md:text-4xl">
            {action.title}
          </h1>
          {action.description ? (
            <p className="max-w-3xl text-base text-base-content/70">
              {action.description}
            </p>
          ) : null}
        </div>

        <AllowlistNotice status={allowlistStatus} />
        <GeneratedSummaryPanel definition={action} />
        <TechnicalDetailsPanel definition={action} slug={slug} />
      </section>

      <aside className="flex flex-col gap-4">
        <ActionVariableForm
          allowlistStatus={allowlistStatus}
          definition={action}
        />
      </aside>
    </main>
  );
}

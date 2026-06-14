import { useQuery } from "@tanstack/react-query";
import { ActionNotFoundError, getPublishedAction } from "src/network/apiClient";
import {
  useAllowlistStatus,
  type AllowlistStatus,
} from "src/ui/allowlist/useAllowlistStatus";
import { ActionPageLayout } from "./ActionPageLayout";

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
    <ActionPageLayout allowlistStatus={allowlistStatus} definition={action} />
  );
}

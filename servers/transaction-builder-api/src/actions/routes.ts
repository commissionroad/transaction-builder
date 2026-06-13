import { validateDraft } from "@transaction-builder/domain";
import { Elysia, t } from "elysia";
import type {
  PublishedActionRecord,
  PublishedActionRepository,
} from "./repository";
import { ACTION_SLUG_PATTERN, createUniqueActionSlug } from "./slug";

interface ErrorResponse {
  error: string;
}

interface ValidationErrorResponse extends ErrorResponse {
  issues: Array<{
    path: string;
    message: string;
  }>;
}

export function createActionsRoutes(repository: PublishedActionRepository) {
  return new Elysia({ prefix: "/actions" })
    .post(
      "/",
      async ({ body, set }) => {
        const validation = validateDraft(body);
        if (!validation.success) {
          set.status = 400;
          return {
            error: "Invalid Action Definition",
            issues: validation.issues,
          } satisfies ValidationErrorResponse;
        }

        const slug = await createUniqueActionSlug(repository);
        const action = await repository.create({
          slug,
          definition: validation.definition,
        });

        set.status = 201;
        return serializePublishedAction(action);
      },
      {
        body: t.Unknown(),
        detail: {
          summary: "Publish Action",
          description: "Stores an immutable Published Action definition.",
          tags: ["Actions"],
        },
      },
    )
    .get(
      "/:slug",
      async ({ params, set }) => {
        if (!ACTION_SLUG_PATTERN.test(params.slug)) {
          set.status = 404;
          return { error: "Action not found" } satisfies ErrorResponse;
        }

        const action = await repository.findBySlug(params.slug);
        if (!action) {
          set.status = 404;
          return { error: "Action not found" } satisfies ErrorResponse;
        }

        return serializePublishedAction(action);
      },
      {
        params: t.Object({
          slug: t.String(),
        }),
        detail: {
          summary: "Get Published Action",
          description: "Returns a Published Action by share slug.",
          tags: ["Actions"],
        },
      },
    );
}

function serializePublishedAction(action: PublishedActionRecord) {
  return {
    slug: action.slug,
    chainId: action.chainId,
    commissionRoadNftId: action.commissionRoadNftId ?? null,
    title: action.title,
    schemaVersion: action.schemaVersion,
    definition: action.definition,
    createdAt: action.createdAt.toISOString(),
  };
}

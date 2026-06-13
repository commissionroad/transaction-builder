import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { createActionsRoutes } from "./actions/routes";
import type { PublishedActionRepository } from "./actions/repository";

export interface CreateAppOptions {
  actionRepository: PublishedActionRepository;
}

export function createApp({ actionRepository }: CreateAppOptions) {
  return new Elysia()
    .use(cors())
    .use(
      openapi({
        documentation: {
          info: {
            title: "CommissionRoad Transaction Builder API",
            version: "0.0.1",
            description: "API for immutable CommissionRoad Published Actions",
          },
        },
      }),
    )
    .get(
      "/health",
      () => ({
        status: "ok",
      }),
      {
        response: {
          200: t.Object({
            status: t.String(),
          }),
        },
        detail: {
          summary: "Health check",
          tags: ["System"],
        },
      },
    )
    .use(createActionsRoutes(actionRepository));
}

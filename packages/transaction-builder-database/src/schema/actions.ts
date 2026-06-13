import type { ActionDefinitionV1 } from "@transaction-builder/domain";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const publishedActions = pgTable(
  "published_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    chainId: integer("chain_id").notNull(),
    commissionRoadNftId: text("commission_road_nft_id"),
    title: text("title").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    definition: jsonb("definition").$type<ActionDefinitionV1>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("published_actions_slug_idx").on(table.slug),
    index("published_actions_chain_idx").on(table.chainId),
    index("published_actions_nft_idx").on(
      table.chainId,
      table.commissionRoadNftId,
    ),
  ],
);

export type PublishedAction = typeof publishedActions.$inferSelect;
export type NewPublishedAction = typeof publishedActions.$inferInsert;

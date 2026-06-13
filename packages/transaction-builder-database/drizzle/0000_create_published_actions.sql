CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "published_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "chain_id" integer NOT NULL,
  "commission_road_nft_id" text,
  "title" text NOT NULL,
  "schema_version" integer NOT NULL,
  "definition" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "published_actions_slug_idx"
  ON "published_actions" ("slug");

CREATE INDEX IF NOT EXISTS "published_actions_chain_idx"
  ON "published_actions" ("chain_id");

CREATE INDEX IF NOT EXISTS "published_actions_nft_idx"
  ON "published_actions" ("chain_id", "commission_road_nft_id");

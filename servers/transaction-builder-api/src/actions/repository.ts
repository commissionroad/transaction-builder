import { db, publishedActions } from "@transaction-builder/database";
import type { ActionDefinitionV1 } from "@transaction-builder/domain";
import { eq } from "drizzle-orm";
import type { SlugRepository } from "./slug";

export interface CreatePublishedActionInput {
  slug: string;
  definition: ActionDefinitionV1;
}

export interface PublishedActionRecord {
  slug: string;
  chainId: number;
  commissionRoadNftId: string | null;
  title: string;
  schemaVersion: number;
  definition: ActionDefinitionV1;
  createdAt: Date;
}

export interface PublishedActionRepository extends SlugRepository {
  create(input: CreatePublishedActionInput): Promise<PublishedActionRecord>;
  findBySlug(slug: string): Promise<PublishedActionRecord | null>;
}

export function createPublishedActionRepository(): PublishedActionRepository {
  return {
    async hasSlug(slug) {
      const [row] = await db
        .select({ slug: publishedActions.slug })
        .from(publishedActions)
        .where(eq(publishedActions.slug, slug))
        .limit(1);

      return row !== undefined;
    },

    async create({ slug, definition }) {
      const [row] = await db
        .insert(publishedActions)
        .values({
          slug,
          chainId: definition.chainId,
          commissionRoadNftId: definition.commissionRoadNftId,
          title: definition.title,
          schemaVersion: definition.schemaVersion,
          definition,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create Published Action");
      }

      return row;
    },

    async findBySlug(slug) {
      const [row] = await db
        .select()
        .from(publishedActions)
        .where(eq(publishedActions.slug, slug))
        .limit(1);

      return row ?? null;
    },
  };
}

import { describe, expect, it } from "bun:test";
import {
  ACTION_SLUG_LENGTH,
  ACTION_SLUG_PATTERN,
  createUniqueActionSlug,
  generateActionSlug,
  type SlugRepository,
} from "./slug";

describe("Action slug generation", () => {
  it("generates URL-safe slugs", () => {
    const slug = generateActionSlug();

    expect(slug).toMatch(ACTION_SLUG_PATTERN);
  });

  it("generates slugs with the expected length", () => {
    const slug = generateActionSlug();

    expect(slug).toHaveLength(ACTION_SLUG_LENGTH);
  });

  it("retries collisions at the repository boundary", async () => {
    const candidates = ["takenSlug1", "freshSlug2"];
    const repository: SlugRepository = {
      async hasSlug(slug) {
        return slug === "takenSlug1";
      },
    };

    const slug = await createUniqueActionSlug(repository, {
      generateSlug: () => candidates.shift() ?? "unexpected",
    });

    expect(slug).toBe("freshSlug2");
  });

  it("fails after the configured collision retry limit", async () => {
    const repository: SlugRepository = {
      async hasSlug() {
        return true;
      },
    };

    await expect(
      createUniqueActionSlug(repository, {
        generateSlug: () => "taken",
        maxAttempts: 2,
      }),
    ).rejects.toThrow(
      "Unable to generate a unique Action slug after 2 attempts",
    );
  });
});

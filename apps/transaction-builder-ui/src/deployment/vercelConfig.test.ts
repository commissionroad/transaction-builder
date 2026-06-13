import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

interface VercelConfig {
  rewrites?: Array<{
    source: string;
    destination: string;
  }>;
}

describe("Vercel deployment config", () => {
  it("serves Vite SPA deep links from index.html", () => {
    const config = JSON.parse(
      readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
    ) as VercelConfig;

    expect(config.rewrites).toContainEqual({
      source: "/(.*)",
      destination: "/index.html",
    });
  });
});

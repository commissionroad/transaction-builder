import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/transaction_builder";

const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
);

const client = postgres(databaseUrl, {
  max: 1,
  ssl: shouldUseSsl(databaseUrl) ? "require" : false,
});

try {
  await client`
    CREATE TABLE IF NOT EXISTS transaction_builder_migrations (
      name text PRIMARY KEY,
      applied_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `;

  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const [existingMigration] = await client<{ name: string }[]>`
      SELECT name
      FROM transaction_builder_migrations
      WHERE name = ${migrationFile}
      LIMIT 1
    `;

    if (existingMigration) {
      console.log(`Skipping ${migrationFile}`);
      continue;
    }

    const migrationSql = await readFile(
      join(migrationsDir, migrationFile),
      "utf8",
    );

    await client.begin(async (transaction) => {
      await transaction.unsafe(migrationSql);
      await transaction`
        INSERT INTO transaction_builder_migrations (name)
        VALUES (${migrationFile})
      `;
    });

    console.log(`Applied ${migrationFile}`);
  }
} finally {
  await client.end();
}

function shouldUseSsl(connectionString: string): boolean {
  return (
    connectionString.includes("rds.amazonaws.com") ||
    connectionString.includes("sslmode=require") ||
    process.env.DATABASE_SSL === "true"
  );
}

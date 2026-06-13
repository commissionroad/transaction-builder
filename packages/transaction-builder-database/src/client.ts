import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/transaction_builder";

export function shouldUseSsl(connectionString: string): boolean {
  return (
    connectionString.includes("rds.amazonaws.com") ||
    connectionString.includes("sslmode=require") ||
    process.env.DATABASE_SSL === "true"
  );
}

export function createDb(
  connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
) {
  const client = postgres(connectionString, {
    ssl: shouldUseSsl(connectionString) ? "require" : false,
  });

  return drizzle(client, { schema });
}

export const db = createDb();

export { schema };

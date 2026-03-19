import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

export function getDb() {
  if (!databaseUrl) {
    return null;
  }

  const client = postgres(databaseUrl, {
    prepare: false,
  });

  return drizzle(client);
}

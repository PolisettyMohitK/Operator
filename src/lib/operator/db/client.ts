import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/lib/operator/db/schema";

type DatabaseEnv = Readonly<Record<string, string | undefined>>;

export function getDatabaseUrl(env: DatabaseEnv) {
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    return null;
  }

  return databaseUrl;
}

let database:
  | ReturnType<typeof drizzle<typeof schema>>
  | null
  | undefined;

export function getDb() {
  const databaseUrl = getDatabaseUrl(process.env);

  if (!databaseUrl) {
    return null;
  }

  if (database) {
    return database;
  }

  const client = neon(databaseUrl);
  database = drizzle(client, { schema });
  return database;
}

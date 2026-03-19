import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/lib/operator/db/schema";

const databaseUrl = process.env.DATABASE_URL;

let database:
  | ReturnType<typeof drizzle<typeof schema>>
  | null
  | undefined;

export function getDb() {
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

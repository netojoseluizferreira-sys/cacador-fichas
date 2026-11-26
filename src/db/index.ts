import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForDb = globalThis as unknown as {
  pool?: Pool;
  db?: NeonDatabase<typeof schema>;
};

export function getDb(): NeonDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não está configurada. Defina DATABASE_URL nas variáveis de ambiente."
    );
  }

  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString });
  }

  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.pool, { schema });
  }

  return globalForDb.db;
}

export async function closeDbPool(): Promise<void> {
  if (globalForDb.pool) {
    await globalForDb.pool.end();
    globalForDb.pool = undefined;
    globalForDb.db = undefined;
  }
}

export { schema };

import { setDefaultResultOrder } from "node:dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

setDefaultResultOrder("ipv4first");

export function createNeonAdapter(connectionString: string): PrismaPg {
  const url = new URL(connectionString);
  if (!url.hostname.endsWith(".neon.tech")) {
    throw new Error("A Neon PostgreSQL connection URL is required.");
  }
  url.searchParams.set("sslmode", "verify-full");
  url.searchParams.set("sslnegotiation", "direct");
  const pool = new Pool({ connectionString: url.toString(), max: 5, idleTimeoutMillis: 5000, connectionTimeoutMillis: 15000 });
  if (process.env.VERCEL) attachDatabasePool(pool);
  return new PrismaPg(pool, { schema: url.searchParams.get("schema") ?? "public", disposeExternalPool: true });
}

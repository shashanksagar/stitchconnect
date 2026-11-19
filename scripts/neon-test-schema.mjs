import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { createNeonAdapter } from "../src/server/neon-adapter.ts";

function command(args, env) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env, cwd: process.cwd() });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Test database command failed (exit ${result.status ?? 1}).`);
}

export async function prepareNeonTestSchema() {
  const pooled = process.env.DATABASE_URL;
  const direct = process.env.DATABASE_URL_UNPOOLED;
  if (!pooled || !direct) throw new Error("Missing Neon DATABASE_URL or DATABASE_URL_UNPOOLED. Run neon env pull.");
  const pooledUrl = new URL(pooled), directUrl = new URL(direct);
  if (pooledUrl.protocol !== "postgresql:" || directUrl.protocol !== "postgresql:" ||
      !pooledUrl.hostname.endsWith(".neon.tech") || !directUrl.hostname.endsWith(".neon.tech")) {
    throw new Error("Automated DB tests require pooled and direct Neon PostgreSQL URLs.");
  }
  const schema = `stitch_test_${randomBytes(10).toString("hex")}`;
  const dir = mkdtempSync(join(tmpdir(), "stitch-neon-test-"));
  const uploads = join(dir, "uploads");
  pooledUrl.searchParams.set("schema", schema);
  pooledUrl.searchParams.set("sslmode", "verify-full");
  pooledUrl.searchParams.set("sslnegotiation", "direct");
  pooledUrl.searchParams.set("connect_timeout", "30");
  directUrl.searchParams.set("schema", schema);
  directUrl.searchParams.set("sslmode", "verify-full");
  directUrl.searchParams.set("sslnegotiation", "direct");
  directUrl.searchParams.set("connect_timeout", "30");
  const env = {
    ...process.env,
    DATABASE_URL: pooledUrl.toString(),
    DATABASE_URL_UNPOOLED: directUrl.toString(),
    UPLOAD_DIR: uploads,
    DEMO_MODE: "true",
  };
  let created = false;
  try {
    const admin = new PrismaClient({ adapter: createNeonAdapter(direct) });
    try { await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true; }
    finally { await admin.$disconnect(); }
    command([resolve("scripts/neon-migrate.mjs")], env);
    command(["--env-file=.env", "prisma/seed.ts"], env);
  } catch (error) {
    if (created) await dropSchema(direct, schema);
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    throw error;
  }
  let closed = false;
  return {
    env,
    async close() {
      if (closed) return;
      closed = true;
      try { await dropSchema(direct, schema); }
      finally { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); }
    },
  };
}

async function dropSchema(direct, schema) {
  if (!/^stitch_test_[a-f0-9]{20}$/.test(schema)) throw new Error("Refusing to remove a non-test schema.");
  const admin = new PrismaClient({ adapter: createNeonAdapter(direct) });
  try { await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
  finally { await admin.$disconnect(); }
}

import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { setDefaultResultOrder } from "node:dns";
import { resolve } from "node:path";
import { Client } from "pg";

setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is required. Run neon env pull first.");

const url = new URL(connectionString);
if (!url.hostname.endsWith(".neon.tech")) {
  throw new Error("DATABASE_URL_UNPOOLED must point to a Neon PostgreSQL endpoint.");
}
url.searchParams.set("sslmode", "verify-full");
url.searchParams.set("sslnegotiation", "direct");
url.searchParams.set("connect_timeout", "30");
const schema = url.searchParams.get("schema") || "public";
if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error("Unsupported PostgreSQL schema name.");

const lock = await readFile(resolve("prisma/migrations/migration_lock.toml"), "utf8");
if (!/^provider\s*=\s*"postgresql"\s*$/m.test(lock)) {
  throw new Error("Prisma migration lock must specify the PostgreSQL provider.");
}

const migrationsRoot = resolve("prisma/migrations");
const migrations = [];
for (const entry of (await readdir(migrationsRoot, { withFileTypes: true })).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const path = resolve(migrationsRoot, entry.name, "migration.sql");
  const sql = await readFile(path, "utf8");
  const lf = sql.replace(/\r\n/g, "\n");
  const checksums = [sql, lf, lf.replace(/\n/g, "\r\n")].map((text) => createHash("sha256").update(text).digest("hex"));
  migrations.push({ name: entry.name, sql, checksum: checksums[0], checksums });
}
if (migrations.length === 0) throw new Error("No PostgreSQL migration SQL files were found.");

const client = new Client({ connectionString: url.toString() });
await client.connect();
try {
  await client.query(`SET search_path TO "${schema}"`);
  await client.query("SELECT pg_advisory_lock(684723451293::bigint)");
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
      )
    `);

    const history = await client.query(`
      SELECT "migration_name", "checksum", "finished_at", "rolled_back_at"
      FROM "_prisma_migrations"
      ORDER BY "started_at", "id"
    `);
    const knownNames = new Set(migrations.map((migration) => migration.name));
    const applied = new Map();
    for (const row of history.rows) {
      if (row.rolled_back_at) continue;
      if (!row.finished_at) throw new Error(`Migration ${row.migration_name} has an unfinished history record.`);
      if (!knownNames.has(row.migration_name)) {
        throw new Error(`Database migration ${row.migration_name} is not present in this checkout.`);
      }
      const migration = migrations.find((item) => item.name === row.migration_name);
      if (!migration.checksums.includes(row.checksum)) {
        throw new Error(`Migration ${row.migration_name} has a checksum mismatch.`);
      }
      if (applied.has(row.migration_name)) {
        throw new Error(`Migration ${row.migration_name} has duplicate active history records.`);
      }
      applied.set(row.migration_name, true);
    }

    let appliedCount = 0;
    for (const migration of migrations) {
      if (applied.has(migration.name)) continue;
      const id = randomUUID();
      await client.query("BEGIN");
      try {
        await client.query(
          `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "applied_steps_count")
           VALUES ($1, $2, $3, 0)`,
          [id, migration.checksum, migration.name],
        );
        await client.query(migration.sql);
        await client.query(
          `UPDATE "_prisma_migrations"
           SET "finished_at" = now(), "applied_steps_count" = 1
           WHERE "id" = $1`,
          [id],
        );
        await client.query("COMMIT");
        appliedCount++;
        console.log(`Applied migration ${migration.name}`);
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          throw new AggregateError([error, rollbackError], `Migration ${migration.name} failed and rollback also failed.`);
        }
        throw error;
      }
    }
    console.log(appliedCount === 0 ? "Neon database is up to date." : `Applied ${appliedCount} migration(s) to schema ${schema}.`);
  } finally {
    await client.query("SELECT pg_advisory_unlock(684723451293::bigint)");
  }
} finally {
  await client.end();
}

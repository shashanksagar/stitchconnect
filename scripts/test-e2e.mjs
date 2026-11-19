import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
process.loadEnvFile(".env");
const directory = mkdtempSync(join(tmpdir(), "stitch-e2e-"));
const env = { ...process.env, DATABASE_URL: `file:${join(directory, "e2e.db")}`, UPLOAD_DIR: join(directory, "uploads"), NEXTAUTH_URL: "http://127.0.0.1:3100", PORT: "3100", HOST: "127.0.0.1", DEMO_MODE: "true" };
try {
  for (const args of [[resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], ["prisma/seed.ts"]]) {
    const result = spawnSync(process.execPath, args, { stdio: "inherit", env });
    if (result.status !== 0) throw new Error("Could not initialize isolated browser test database.");
  }
  const selection = process.argv.slice(2);
  const batches = selection.length ? [selection] : [["--grep-invert", "@restart"], ["--grep", "@restart", "--output", join("test-results", "restart")]];
  for (const batch of batches) {
    const result = spawnSync(process.execPath, [resolve("node_modules/@playwright/test/cli.js"), "test", ...batch], { stdio: "inherit", env });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    if (process.exitCode !== 0) break;
  }
} finally {
  rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}

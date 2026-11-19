import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { prepareNeonTestSchema } from "./neon-test-schema.mjs";
const database = await prepareNeonTestSchema();
const env = { ...database.env, NEXTAUTH_URL: "http://127.0.0.1:3100", PORT: "3100", HOST: "127.0.0.1" };
try {
  const selection = process.argv.slice(2);
  const batches = selection.length ? [selection] : [["--grep-invert", "@restart"], ["--grep", "@restart", "--output", join("test-results", "restart")]];
  for (const batch of batches) {
    const result = spawnSync(process.execPath, [resolve("node_modules/@playwright/test/cli.js"), "test", ...batch], { stdio: "inherit", env });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    if (process.exitCode !== 0) break;
  }
} finally {
  await database.close();
}

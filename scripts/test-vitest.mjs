import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { prepareNeonTestSchema } from "./neon-test-schema.mjs";
const database = await prepareNeonTestSchema();
try {
  const result = spawnSync(process.execPath, [resolve("node_modules/vitest/vitest.mjs"), "run", ...process.argv.slice(2)], { stdio: "inherit", env: database.env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await database.close();
}

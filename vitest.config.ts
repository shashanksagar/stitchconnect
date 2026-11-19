import { defineConfig } from "vitest/config";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.loadEnvFile(".env");
const directory = mkdtempSync(join(tmpdir(), "stitch-unit-"));
process.env.DATABASE_URL = `file:${join(directory, "unit.db")}`;
process.env.UPLOAD_DIR = join(directory, "uploads");
process.env.STITCH_TEST_DIR = directory;
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], fileParallelism: false, globalSetup: ["./tests/global-setup.ts"], testTimeout: 20000 },
});

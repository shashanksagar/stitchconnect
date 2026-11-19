import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
export default function setup() {
  execFileSync(process.execPath, [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], { stdio: "pipe", env: process.env });
  execFileSync(process.execPath, ["prisma/seed.ts"], { stdio: "pipe", env: process.env });
  return () => {
    if (!process.env.STITCH_TEST_DIR?.includes("stitch-unit-")) throw new Error("Unsafe test cleanup directory.");
    rmSync(process.env.STITCH_TEST_DIR, { recursive: true, force: true });
  };
}

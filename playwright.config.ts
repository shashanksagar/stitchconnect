import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, timeout: 60000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  reporter: [["list"]],
  webServer: { command: "node --env-file=.env --import=./scripts/set-node-env.mjs server.ts --production", url: "http://127.0.0.1:3100/api/health", reuseExistingServer: false, timeout: 120000 },
});

import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    "/*": ["./node_modules/.prisma/client/query_compiler_bg.wasm"],
  },
};
export default config;

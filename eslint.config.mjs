import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "playwright-report/**", "test-results/**"] },
  { rules: { "@next/next/no-img-element": "off" } },
];
export default config;

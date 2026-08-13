import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // wrangler's local dev/build cache — not source, and functions/
    // and workers/ are type-checked separately (see their own
    // tsconfig.json), not by this Next.js lint config.
    ".wrangler/**",
    "functions/**",
    "workers/**",
  ]),
]);

export default eslintConfig;

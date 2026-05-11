import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Build / generated output at any depth (root `.next` and nested copies)
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/coverage/**",
    "**/next-env.d.ts",
    // Accidental nested duplicate app (`./prime-hr/` inside this repo) — avoid linting it twice
    "prime-hr/**",
  ]),
]);

export default eslintConfig;

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: "apps/web/" } },
    rules: {
      "@next/next/no-img-element": "off",
      /**
       * Every screen is a client component that loads data over the cookie
       * session (the API cookie is HttpOnly, so a server component cannot read
       * it and Server Actions would only move the same effect to the server).
       * The fetch effects therefore flip `loading`/`error` at the top of the
       * effect body, which this React Compiler rule rejects even though the
       * state genuinely comes from outside React. Kept as a warning so the
       * count stays visible instead of being silently hidden.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["apps/api/**", "packages/**", "scripts/**", "tests/**"],
    rules: { "@next/next/no-assign-module-variable": "off" },
  },
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "**/generated/**",
    ".local/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

// eslint.config.mjs
// eslint-config-next 16 ships native Flat Config arrays (no more FlatCompat).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  // Base configurations: Next.js core-web-vitals + TypeScript (flat config).
  // These already ignore node_modules, .next, out, build and next-env.d.ts.
  ...nextCoreWebVitals,
  ...nextTypescript,

  // Project-specific rules (override base configs if needed)
  {
    rules: {
      // Always require semicolons
      semi: ["error", "always"],

      // Use double quotes by default, but allow single quotes if escaping is needed
      quotes: ["error", "double", { avoidEscape: true }],

      // Prefer modern JavaScript practices
      "prefer-arrow-callback": ["error"],
      "prefer-template": ["error"],

      // Warn on unused variables; allow names starting with "_" as intentionally unused
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // Linter options (quality of life improvements)
  {
    linterOptions: {
      // Warn if there are unused eslint-disable comments
      reportUnusedDisableDirectives: true,
    },
  },
];

export default config;

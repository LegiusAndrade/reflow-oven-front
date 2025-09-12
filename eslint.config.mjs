// eslint.config.mjs
import { fileURLToPath } from 'url';
import path from 'path';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert legacy "extends" (like 'next/core-web-vitals') into flat config format
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // 1) Ignore patterns (files/folders not linted by ESLint)
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },

  // 2) Base configurations: Next.js + TypeScript + Prettier (via compat)
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
  }),

  // 3) Project-specific rules (override base configs if needed)
  {
    rules: {
      // Always require semicolons
      semi: ['error', 'always'],

      // Use double quotes by default, but allow single quotes if escaping is needed
      quotes: ['error', 'double', { avoidEscape: true }],

      // Prefer modern JavaScript practices
      'prefer-arrow-callback': ['error'],
      'prefer-template': ['error'],

      // Warn on unused variables; allow names starting with "_" as intentionally unused
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // 4) Linter options (quality of life improvements)
  {
    linterOptions: {
      // Warn if there are unused eslint-disable comments
      reportUnusedDisableDirectives: true,
    },
  },
];

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// Unit tests for the pure, safety/security-critical logic. Default env is node; a test that imports
// browser-coupled modules opts into jsdom with `// @vitest-environment jsdom` at the top of the file.
export default defineConfig({
  resolve: {
    alias: { "@": path.join(root, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});

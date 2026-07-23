import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    // Vitest suites live under tests/. Colocated src/**/*.test.ts files use
    // node:test TAP (see researchStartApprovals, commandSearch, etc.) and must
    // not be loaded by Vitest — they fail with "No test suite found".
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", "dist/**", "src/**/*.test.ts"],
  },
});

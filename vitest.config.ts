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
    // Vitest suites live under tests/. Files under src/**/*.test.ts use
    // node:test (TAP) and must not be loaded here — they fail with
    // "No test suite found" (see #194).
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "src/**/*.test.ts"],
  },
});

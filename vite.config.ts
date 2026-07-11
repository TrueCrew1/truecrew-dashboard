import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      proxy: {
        "/ingest/static": {
          target: "https://us-assets.i.posthog.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ingest/, ""),
        },
        "/ingest/array": {
          target: "https://us-assets.i.posthog.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ingest/, ""),
        },
        "/ingest": {
          target: env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ingest/, ""),
        },
      },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "api/**/*.test.ts", "lib/**/*.test.ts"],
    },
  };
});

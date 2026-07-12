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
    // Local-verification only: `vite preview` serves the static production
    // build with no backend of its own. Proxying /api to a running
    // `vercel dev` instance lets that build exercise live API routes in
    // environments where `vite dev`'s asset requests can't be reached
    // directly. Not part of the production deploy path.
    preview: {
      proxy: {
        "/api": {
          target: env.VITE_PREVIEW_API_PROXY_TARGET || "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "api/**/*.test.ts", "lib/**/*.test.ts"],
    },
  };
});

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { apiDevPlugin } from "./vite/api-dev-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
  plugins: [react(), apiDevPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { apiDevPlugin } from "./vite/api-dev-plugin";

export default defineConfig({
  plugins: [apiDevPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

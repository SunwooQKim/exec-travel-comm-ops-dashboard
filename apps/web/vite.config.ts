import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@comm-ops/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      },
    },
    server: {
      port: 5173,
      proxy: env.VITE_API_URL
        ? undefined
        : {
            "/api": {
              target: "http://localhost:3001",
              changeOrigin: true,
            },
          },
    },
  };
});

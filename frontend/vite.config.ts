import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const backend = env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/stream": { target: backend, ws: true, changeOrigin: true },
        "/model": backend,
        "/config": backend,
        "/finance": backend,
        "/lifetime": backend,
        "/forecast": backend,
        "/curves": backend,
        "/control": backend,
        "/scenarios": backend,
        "/locations": backend,
        "/schedule": backend,
        "/compare": backend,
      },
    },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Reenvia /api al backend en dev (evita problemas de CORS).
      "/api": "http://localhost:4000",
    },
  },
});

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    // Keep browser requests on the same origin while reaching the real Hono API.
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
});

// Vite build configuration for the Bitboard frontend.
// - @vitejs/plugin-react enables JSX and React Fast Refresh in development
// - @tailwindcss/vite integrates Tailwind v4 directly into the Vite pipeline
//   (no postcss.config.js needed — Tailwind v4 uses a Vite plugin instead)
// - server.proxy forwards /api requests to the Express backend on port 3001
//   so the frontend and backend can run simultaneously without CORS issues
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync } from "fs";

// Copies index.html → 404.html so Render serves the SPA for unknown paths.
function spaFallback() {
  return {
    name: "spa-404-fallback",
    closeBundle() {
      copyFileSync("dist/index.html", "dist/404.html");
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});

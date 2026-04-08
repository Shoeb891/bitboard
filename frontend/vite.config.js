// Vite build configuration for the Bitboard frontend.
// - @vitejs/plugin-react enables JSX and React Fast Refresh in development
// - @tailwindcss/vite integrates Tailwind v4 directly into the Vite pipeline
//   (no postcss.config.js needed — Tailwind v4 uses a Vite plugin instead)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});

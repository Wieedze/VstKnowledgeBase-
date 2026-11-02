import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site reads the repo's Markdown files (one level above site/).
// base "./": relative paths, so it works on GitHub Pages under /VstKnowledgeBase-/.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  build: { chunkSizeWarningLimit: 1500 },
});

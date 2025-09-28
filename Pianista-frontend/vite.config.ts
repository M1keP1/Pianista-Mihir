import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // write a report after build at dist/stats.html
    { ...visualizer({ filename: "dist/stats.html", template: "treemap", gzipSize: true, brotliSize: true }), apply: "build" },
  ],
  optimizeDeps: { include: ["mermaid"] },
  resolve: {
    alias: [
      { find: "@/app", replacement: path.resolve(__dirname, "./src/app") },
      { find: "@/features", replacement: path.resolve(__dirname, "./src/features") },
      { find: "@/shared", replacement: path.resolve(__dirname, "./src/shared") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
})

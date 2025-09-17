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
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

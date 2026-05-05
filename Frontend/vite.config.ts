import path from "path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router-dom/") || id.includes("node_modules/react-router/")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/framer-motion/")) {
            return "vendor-framer";
          }
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/jspdf-autotable")) {
            return "vendor-pdf";
          }
          if (id.includes("node_modules/xlsx/") || id.includes("node_modules/exceljs/")) {
            return "vendor-excel";
          }
          if (id.includes("node_modules/lucide-react/")) {
            return "vendor-lucide";
          }
          if (id.includes("node_modules/socket.io-client/") || id.includes("node_modules/engine.io-client/") || id.includes("node_modules/socket.io-parser/")) {
            return "vendor-socket";
          }
          if (id.includes("node_modules/")) {
            return "vendor-misc";
          }
        },
      },
    },
  },
})

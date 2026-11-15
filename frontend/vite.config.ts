import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envDir: "../",
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    // Output directly into backend/public so Express can serve it
    outDir: "../backend/public",
    emptyOutDir: true,
    // Split vendor libraries into separate chunks so browsers can cache them independently
    rollupOptions: {
      output: {
        // Rolldown (used by Vite 8) accepts a function here. Keep the same
        // cacheable vendor chunks that were previously declared as an object.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/(?:react|react-dom|react-router-dom)\//.test(id)) return "vendor-react";
          if (id.includes("@radix-ui")) return "vendor-ui";
          if (id.includes("lucide-react")) return "vendor-icons";
          return undefined;
        },
      },
    },
    // Warn when a chunk exceeds 500 KB (default is 500, making explicit)
    chunkSizeWarningLimit: 500,
  },
}));

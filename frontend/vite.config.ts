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
    // Split vendor libraries into separate chunks so browsers can cache them independently
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached aggressively, rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI component library
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
          ],
          // Icons — large package, worth isolating
          "vendor-icons": ["lucide-react"],
        },
      },
    },
    // Warn when a chunk exceeds 500 KB (default is 500, making explicit)
    chunkSizeWarningLimit: 500,
  },
}));

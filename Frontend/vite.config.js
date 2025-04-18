import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080, // Your frontend runs here
    proxy: {
      // Keep your existing auth proxy if needed
      '/auth/github': 'http://localhost:5000', // Backend handles this

      // --- ADD THIS RULE ---
      // Proxy any request starting with /api to your backend server
      '/api': {
        target: 'http://localhost:5000', // Your backend server address
        changeOrigin: true, // Recommended for avoiding CORS issues
        secure: false,      // Since your backend is likely http, not https
        // No rewrite needed if your backend expects routes like /api/pending-withdrawals
      }
      // --- END OF ADDED RULE ---
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({ babel: { plugins: [["babel-plugin-react-compiler"]] } }),
  ],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "../shared/src"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
  },
});

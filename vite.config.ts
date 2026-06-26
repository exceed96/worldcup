import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/fifa-api": {
        target: "https://api.fifa.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fifa-api/, ""),
      },
    },
  },
});

import { fileURLToPath, URL } from "url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      allow: ["../"],
    },
  },
  build: {
    rollupOptions: {
      external: [
        /gui/,
        /^\/plugin\/range\/static\//
      ]
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    },
  }
});

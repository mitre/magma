import { fileURLToPath, URL } from "url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Backend Caldera server
  const backend = env.VITE_BACKEND_URL || "http://localhost:8888";

  return {
    plugins: [vue()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      fs: {
        allow: ["../"],
      },
      proxy: {
        // 🔐 Auth
        "/enter": {
          target: backend,
          changeOrigin: true,
        },
        "/logout": {
          target: backend,
          changeOrigin: true,
        },

        // 🔌 Core API
        "/api": {
          target: backend,
          changeOrigin: true,
        },

        // 🧩 Plugins
        "/plugins": {
          target: backend,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        external: [/gui/],
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});

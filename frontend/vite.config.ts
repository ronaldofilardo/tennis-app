import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Workbox em modo injectManifest para maior controle
      strategies: "generateSW",
      workbox: {
        // App shell: arquivos estáticos ficam em cache
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Rotas da API nunca ficam em cache (sempre online quando disponível)
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Racket",
        short_name: "Racket",
        description: "Gerenciador de esportes de raquete",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/vite.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Enviando requisição para:", req.method, proxyReq.path);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log(
              "Recebendo resposta:",
              proxyRes.statusCode,
              req.method,
              proxyRes.req.path,
            );
          });
        },
      },
    },
  },
});

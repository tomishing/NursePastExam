/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version waits until the user taps 更新 (UpdatePrompt), so it never reloads mid-review.
      registerType: "prompt",
      manifest: {
        name: "看護・保健師 国試過去問",
        short_name: "国試過去問",
        description: "看護師・保健師国家試験の疫学・公衆衛生分野の過去問を間隔反復で学習します。",
        lang: "ja",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        theme_color: "#0f766e",
        background_color: "#f8fafc",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache everything, including cards.json and every figure, so the whole deck studies offline.
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,webp,ico,json}"],
        // cards.json is about 1.1 MB and the largest 別冊 image about 0.8 MB.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // Allow testing on a phone over the local network (`npm run dev -- --host`).
    port: 5173,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    // The 04:00 rollover is local time; pin the zone so tests behave the same everywhere.
    env: { TZ: "Asia/Tokyo" },
  },
});

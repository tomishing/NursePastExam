/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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

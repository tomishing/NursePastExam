// Generates the PWA icons from public/favicon.svg: `npx pwa-assets-generator`.
// The output PNGs are committed, so this only needs re-running when the icon changes.
import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    // The icon already has a full-bleed background, so keep padding small and use the same teal.
    maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: "#0f766e" } },
    apple: { ...minimal2023Preset.apple, padding: 0.1, resizeOptions: { background: "#0f766e" } },
  },
  images: ["public/favicon.svg"],
});

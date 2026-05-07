import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Override at build time so GitHub Pages / a custom domain both work without code changes.
const SITE = process.env.SITE_URL ?? "https://example.github.io";
const BASE = process.env.SITE_BASE ?? "/";

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: "ignore",
  integrations: [mdx(), sitemap()],
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  build: {
    format: "directory",
  },
  vite: {
    resolve: {
      alias: {
        "~": new URL("./src", import.meta.url).pathname,
      },
    },
  },
});

import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Vercel sets VERCEL_PROJECT_PRODUCTION_URL to the production hostname (no protocol).
// SITE_URL still wins so a custom domain can be set explicitly.
const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;
const SITE = process.env.SITE_URL ?? productionUrl ?? "http://localhost:4321";

export default defineConfig({
  site: SITE,
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

import type { APIContext } from "astro";

export function GET(context: APIContext) {
  const sitemapIndex = new URL("/sitemap-index.xml", context.site ?? context.url).toString();
  const lastmod = new Date().toISOString();

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${sitemapIndex}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>
`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
}

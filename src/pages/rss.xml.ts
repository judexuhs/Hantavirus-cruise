import type { APIContext } from "astro";
import { getCollection } from "astro:content";

function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(context: APIContext) {
  const all = await getCollection("news");
  const items = all
    .map((e) => e.data)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 50);

  const siteUrl = context.site?.toString() ?? "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Hantavirus Cruise Tracker</title>
  <link>${siteUrl}</link>
  <description>Aggregated, source-linked coverage of the Hantavirus cruise outbreak.</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items
  .map(
    (item) => `  <item>
    <title>${escape(item.title)}</title>
    <link>${escape(item.url)}</link>
    <guid isPermaLink="false">${escape(item.id)}</guid>
    <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
    <source>${escape(item.source)}</source>
    <description>${escape(item.excerpt ?? "")}</description>
  </item>`,
  )
  .join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

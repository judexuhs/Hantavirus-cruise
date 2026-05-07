import { createHash } from "node:crypto";
import type { NewsItem } from "../types.ts";

/**
 * Stable identifier for a news item: sha1 of the canonicalized URL.
 * Two fetchers reporting the same article (different RSS proxies, etc.)
 * will collapse to a single entry.
 */
export function stableId(url: string): string {
  return createHash("sha1").update(canonicalUrl(url)).digest("hex").slice(0, 16);
}

/**
 * Strip tracking params and fragments so the same article from different
 * referrers dedupes cleanly.
 */
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    const dropParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
      "ref",
      "ref_src",
    ];
    for (const p of dropParams) u.searchParams.delete(p);
    u.hash = "";
    if (u.hostname === "news.google.com" && u.searchParams.get("url")) {
      const real = u.searchParams.get("url");
      if (real) return canonicalUrl(real);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Best-effort plain-text excerpt: strip HTML, collapse whitespace, trim.
 */
export function toExcerpt(html: string | undefined, max = 280): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  if (!text) return undefined;
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/**
 * Convenience for fetchers: build a NewsItem from minimal raw fields.
 */
export function buildItem(input: {
  title: string;
  url: string;
  source: string;
  sourceType: NewsItem["sourceType"];
  publishedAt: string;
  fetchedAt: string;
  excerpt?: string;
  tags?: string[];
}): NewsItem {
  const url = canonicalUrl(input.url);
  return {
    id: stableId(url),
    title: input.title.trim(),
    url,
    source: input.source,
    sourceType: input.sourceType,
    publishedAt: new Date(input.publishedAt).toISOString(),
    fetchedAt: input.fetchedAt,
    excerpt: input.excerpt,
    tags: input.tags ?? [],
    lang: "en",
  };
}

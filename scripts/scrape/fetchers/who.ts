import type { Fetcher, FetchContext, NewsItem } from "../types.ts";
import { fetchFeed } from "../pipeline/rss.ts";
import { buildItem, toExcerpt } from "../pipeline/normalize.ts";

/**
 * WHO Disease Outbreak News (DON) — the canonical authoritative source
 * for cross-border outbreaks. WHO has reorganized its feed paths multiple
 * times; we try the known historical paths in order and use the first one
 * that responds. If they all fail the orchestrator records a single error.
 */
const DON_API = "https://www.who.int/api/hubs/diseaseoutbreaknews";

const FEEDS = [
  // Broad WHO news feed kept as a fallback; still useful for outbreak items.
  "https://www.who.int/rss-feeds/news-english.xml",
  // Historical DON feed (often moved/retired).
  "https://www.who.int/feeds/entity/csr/don/en/rss.xml",
];

type DonApiItem = {
  Title?: string;
  ItemDefaultUrl?: string;
  PublicationDateAndTime?: string;
  PublicationDate?: string;
  Summary?: string;
};

type DonODataResponse = {
  value?: DonApiItem[];
};

export const whoFetcher: Fetcher = {
  name: "who",
  sourceType: "official",
  async fetch(ctx: FetchContext): Promise<NewsItem[]> {
    // Prefer the stable Sitefinity hub API (RSS paths are frequently reorganized).
    try {
      const res = await fetch(DON_API, { headers: { accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`DON API responded ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as DonODataResponse;
      const items = Array.isArray(data?.value) ? data.value : [];
      const out = items
        .filter((i) => i.Title && i.ItemDefaultUrl)
        .map((i) =>
          buildItem({
            title: i.Title as string,
            url: i.ItemDefaultUrl as string,
            source: "WHO",
            sourceType: "official",
            publishedAt: i.PublicationDateAndTime ?? i.PublicationDate ?? ctx.fetchedAt,
            fetchedAt: ctx.fetchedAt,
            excerpt: toExcerpt(i.Summary),
            tags: ["who"],
          }),
        );
      if (out.length > 0) return out;
      // If the API returns zero items for any reason, fall back to RSS.
    } catch {
      // fall through to RSS fallback
    }

    let lastErr: Error | undefined;
    for (const url of FEEDS) {
      try {
        const raw = await fetchFeed(url);
        return raw
          .filter((r) => r.title && r.link)
          .map((r) =>
            buildItem({
              title: r.title,
              url: r.link,
              source: "WHO",
              sourceType: "official",
              publishedAt: r.pubDate ?? ctx.fetchedAt,
              fetchedAt: ctx.fetchedAt,
              excerpt: toExcerpt(r.description ?? r.content),
              tags: ["who"],
            }),
          );
      } catch (err) {
        lastErr = err as Error;
      }
    }
    throw lastErr ?? new Error("WHO: no feed reachable");
  },
};

export default whoFetcher;

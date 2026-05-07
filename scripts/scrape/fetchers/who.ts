import type { Fetcher, FetchContext, NewsItem } from "../types.ts";
import { fetchFeed } from "../pipeline/rss.ts";
import { buildItem, toExcerpt } from "../pipeline/normalize.ts";

/**
 * WHO Disease Outbreak News (DON) — the canonical authoritative source
 * for cross-border outbreaks. WHO has reorganized its feed paths multiple
 * times; we try the known historical paths in order and use the first one
 * that responds. If they all fail the orchestrator records a single error.
 */
const FEEDS = [
  "https://www.who.int/rss-feeds/news-english.xml",
  "https://www.who.int/feeds/entity/csr/don/en/rss.xml",
];

export const whoFetcher: Fetcher = {
  name: "who",
  sourceType: "official",
  async fetch(ctx: FetchContext): Promise<NewsItem[]> {
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

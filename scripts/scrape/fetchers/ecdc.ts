import type { Fetcher, FetchContext, NewsItem } from "../types.ts";
import { fetchFeed } from "../pipeline/rss.ts";
import { buildItem, toExcerpt } from "../pipeline/normalize.ts";

/**
 * ECDC news + threat reports. Like WHO, ECDC has moved feed paths over
 * time; we try the candidates in order.
 */
const FEEDS = [
  "https://www.ecdc.europa.eu/en/news-events/feed",
  "https://www.ecdc.europa.eu/en/threats-and-outbreaks/rss",
  "https://www.ecdc.europa.eu/en/feed",
];

export const ecdcFetcher: Fetcher = {
  name: "ecdc",
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
              source: "ECDC",
              sourceType: "official",
              publishedAt: r.pubDate ?? ctx.fetchedAt,
              fetchedAt: ctx.fetchedAt,
              excerpt: toExcerpt(r.description ?? r.content),
              tags: ["ecdc"],
            }),
          );
      } catch (err) {
        lastErr = err as Error;
      }
    }
    throw lastErr ?? new Error("ECDC: no feed reachable");
  },
};

export default ecdcFetcher;

import type { Fetcher, FetchContext, NewsItem } from "../types.ts";
import { fetchFeed } from "../pipeline/rss.ts";
import { buildItem, toExcerpt } from "../pipeline/normalize.ts";

/**
 * Reuters Health topic feed. Reuters changes its feed paths from time to
 * time; if this 404s the orchestrator will record an error and the rest of
 * the pipeline still runs.
 */
const FEEDS = [
  "https://www.reutersagency.com/feed/?best-topics=health&post_type=best",
  "https://feeds.reuters.com/reuters/healthNews",
  "http://feeds.reuters.com/reuters/healthNews",
];

export const reutersFetcher: Fetcher = {
  name: "reuters",
  sourceType: "news",
  async fetch(ctx: FetchContext): Promise<NewsItem[]> {
    const out: NewsItem[] = [];
    let lastErr: Error | undefined;
    for (const url of FEEDS) {
      try {
        const raw = await fetchFeed(url, { timeoutMs: 4000 });
        for (const r of raw) {
          if (!r.title || !r.link) continue;
          out.push(
            buildItem({
              title: r.title,
              url: r.link,
              source: "Reuters",
              sourceType: "news",
              publishedAt: r.pubDate ?? ctx.fetchedAt,
              fetchedAt: ctx.fetchedAt,
              excerpt: toExcerpt(r.description ?? r.content),
              tags: ["reuters"],
            }),
          );
        }
        if (out.length > 0) return out;
      } catch (err) {
        lastErr = err as Error;
      }
    }
    if (lastErr) throw lastErr;
    return out;
  },
};

export default reutersFetcher;

import type { Fetcher, FetchContext, NewsItem } from "../types.ts";
import { fetchFeed } from "../pipeline/rss.ts";
import { buildItem, toExcerpt } from "../pipeline/normalize.ts";

/**
 * Google News RSS — broad, near-realtime mainstream coverage. We use a
 * focused query so the volume is manageable and the keyword-filter step
 * downstream is mostly a safety net.
 */
const QUERY = '("hantavirus") AND (cruise OR ship OR voyage OR vessel)';
const FEED = `https://news.google.com/rss/search?q=${encodeURIComponent(
  QUERY,
)}&hl=en-US&gl=US&ceid=US:en`;

export const googleNewsFetcher: Fetcher = {
  name: "google-news",
  sourceType: "news",
  async fetch(ctx: FetchContext): Promise<NewsItem[]> {
    const raw = await fetchFeed(FEED);
    return raw
      .filter((r) => r.title && r.link)
      .map((r) =>
        buildItem({
          title: r.title,
          url: r.link,
          source: r.source ?? "Google News",
          sourceType: "news",
          publishedAt: r.pubDate ?? ctx.fetchedAt,
          fetchedAt: ctx.fetchedAt,
          excerpt: toExcerpt(r.description ?? r.content),
          tags: ["google-news"],
        }),
      );
  },
};

export default googleNewsFetcher;

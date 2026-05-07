import type { Fetcher, FetchContext, NewsItem } from "../types.ts";
import { fetchFeed } from "../pipeline/rss.ts";
import { buildItem, toExcerpt } from "../pipeline/normalize.ts";

/**
 * CDC Health Alert Network (HAN) and CDC Travel Health Notices feeds.
 * Both are low-volume, high-trust sources. We pull them together and
 * tag each item with the originating sub-source so the UI can render it.
 */
const FEEDS: { url: string; source: string }[] = [
  { url: "https://emergency.cdc.gov/han/han.rss", source: "CDC HAN" },
  { url: "https://wwwnc.cdc.gov/travel/rss/notices.xml", source: "CDC Travel Health Notices" },
];

export const cdcFetcher: Fetcher = {
  name: "cdc",
  sourceType: "official",
  async fetch(ctx: FetchContext): Promise<NewsItem[]> {
    const out: NewsItem[] = [];
    for (const f of FEEDS) {
      const raw = await fetchFeed(f.url).catch((err) => {
        throw new Error(`${f.source}: ${(err as Error).message}`);
      });
      for (const r of raw) {
        if (!r.link || !r.title) continue;
        out.push(
          buildItem({
            title: r.title,
            url: r.link,
            source: f.source,
            sourceType: "official",
            publishedAt: r.pubDate ?? ctx.fetchedAt,
            fetchedAt: ctx.fetchedAt,
            excerpt: toExcerpt(r.description ?? r.content),
            tags: ["cdc"],
          }),
        );
      }
    }
    return out;
  },
};

export default cdcFetcher;

import type { Fetcher, FetchContext, NewsItem } from "../types.ts";
import { buildItem, toExcerpt } from "../pipeline/normalize.ts";

/**
 * Reddit JSON search across a small allowlist of subreddits. Treated as
 * social signal — clearly badged in the UI and capped further downstream.
 */
const SUBS = ["news", "worldnews", "cruise", "medicine"];
const QUERY = "hantavirus cruise";

interface RedditChild {
  data: {
    id: string;
    title: string;
    permalink: string;
    url: string;
    subreddit: string;
    selftext?: string;
    created_utc: number;
    score: number;
  };
}

export const redditFetcher: Fetcher = {
  name: "reddit",
  sourceType: "social",
  async fetch(ctx: FetchContext): Promise<NewsItem[]> {
    const out: NewsItem[] = [];
    for (const sub of SUBS) {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(
        QUERY,
      )}&restrict_sr=on&sort=new&limit=25`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      let res: Response | undefined;
      try {
        res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "user-agent": "hantavirus-cruise-tracker/0.1 (feed-aggregator)",
            accept: "application/json",
          },
        });
      } catch {
        // Reddit can time out / be blocked in some networks; skip this subreddit.
        continue;
      } finally {
        clearTimeout(id);
      }

      if (!res.ok) {
        // 403/429 happens on Reddit when run from CI without auth — skip the sub
        // rather than failing the whole fetcher.
        continue;
      }
      const json = (await res.json()) as { data?: { children?: RedditChild[] } };
      for (const c of json.data?.children ?? []) {
        const d = c.data;
        if (d.score < 5) continue; // ignore low-signal posts
        out.push(
          buildItem({
            title: d.title,
            url: `https://www.reddit.com${d.permalink}`,
            source: `Reddit · r/${d.subreddit}`,
            sourceType: "social",
            publishedAt: new Date(d.created_utc * 1000).toISOString(),
            fetchedAt: ctx.fetchedAt,
            excerpt: toExcerpt(d.selftext, 200),
            tags: ["reddit", `r/${d.subreddit}`],
          }),
        );
      }
    }
    return out;
  },
};

export default redditFetcher;

import type { NewsItem, SourceType } from "../types.ts";

const SOURCE_WEIGHT: Record<SourceType, number> = {
  official: 1.0,
  news: 0.6,
  social: 0.3,
};

const HALF_LIFE_DAYS = 5;

/**
 * Combined score = sourceWeight * exp(-ageDays / halfLife)
 * Used to rank the Sources page so high-trust + fresh items sit on top.
 */
export function score(item: NewsItem, now: Date = new Date()): number {
  const w = SOURCE_WEIGHT[item.sourceType];
  const ageDays =
    (now.getTime() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const decay = Math.exp(-Math.max(0, ageDays) / HALF_LIFE_DAYS);
  return Number((w * decay).toFixed(4));
}

export function applyScores(items: NewsItem[], now?: Date): NewsItem[] {
  const at = now ?? new Date();
  return items.map((i) => ({ ...i, score: score(i, at) }));
}

/**
 * Cap social items so a chatty subreddit can't drown the feed. Keep the
 * top-N by score, drop the rest.
 */
export function capSocial(items: NewsItem[], limit: number): NewsItem[] {
  const social = items
    .filter((i) => i.sourceType === "social")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
  const others = items.filter((i) => i.sourceType !== "social");
  return [...others, ...social];
}

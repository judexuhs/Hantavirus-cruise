import type { NewsItem } from "../types.ts";

/**
 * Collapse items that share an id, picking the one with the higher-trust
 * source type and the more recent fetchedAt.
 */
export function dedupe(items: NewsItem[]): NewsItem[] {
  const trust: Record<NewsItem["sourceType"], number> = {
    official: 3,
    news: 2,
    social: 1,
  };
  const byId = new Map<string, NewsItem>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    const a = trust[existing.sourceType];
    const b = trust[item.sourceType];
    if (b > a) {
      byId.set(item.id, item);
    } else if (b === a && item.fetchedAt > existing.fetchedAt) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

/**
 * Filter by keyword spec applied to the title + excerpt. Case-insensitive,
 * substring match — fast and predictable. Hand off to a real NLP layer
 * later if false positives become a problem.
 */
export function keywordFilter(
  items: NewsItem[],
  spec: { required: string[]; context: string[] },
): NewsItem[] {
  const req = spec.required.map((s) => s.toLowerCase());
  const ctx = spec.context.map((s) => s.toLowerCase());
  return items.filter((item) => {
    const hay = `${item.title} ${item.excerpt ?? ""}`.toLowerCase();
    const hasReq = req.length === 0 || req.some((w) => hay.includes(w));
    const hasCtx = ctx.length === 0 || ctx.some((w) => hay.includes(w));
    return hasReq && hasCtx;
  });
}

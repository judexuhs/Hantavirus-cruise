/**
 * Orchestrator entry point. Runs every fetcher in parallel with isolated
 * failure, normalizes, filters, dedupes, scores, merges with existing
 * on-disk state, and writes the result back into the Astro content
 * collection plus a meta file.
 *
 * Run via: `pnpm scrape` or `pnpm scrape:dry`.
 */
import type { Fetcher, FetchContext, NewsItem, RunReport } from "./types.ts";
import { applyScores, capSocial } from "./pipeline/score.ts";
import { dedupe, keywordFilter } from "./pipeline/dedupe.ts";
import { readExistingItems, writeItems, writeMeta } from "./pipeline/io.ts";
import cdc from "./fetchers/cdc.ts";
import who from "./fetchers/who.ts";
import ecdc from "./fetchers/ecdc.ts";
import googleNews from "./fetchers/google-news.ts";
import reuters from "./fetchers/reuters.ts";
import reddit from "./fetchers/reddit.ts";

const FETCHERS: Fetcher[] = [cdc, who, ecdc, googleNews, reuters, reddit];

const KEYWORDS = {
  required: ["hantavirus", "hanta"],
  context: ["cruise", "ship", "voyage", "vessel", "passenger", "crew", "outbreak"],
};

const MAX_TOTAL_ITEMS = 200;
const SOCIAL_CAP = 20;
const RETENTION_DAYS = 90;

async function main(): Promise<void> {
  const dry = process.argv.includes("--dry");
  const fetchedAt = new Date().toISOString();
  const ctx: FetchContext = { fetchedAt, keywords: KEYWORDS };

  console.log(`[scrape] starting at ${fetchedAt} (${dry ? "DRY" : "live"})`);

  const settled = await Promise.allSettled(
    FETCHERS.map(async (f) => ({ name: f.name, items: await f.fetch(ctx) })),
  );

  const fresh: NewsItem[] = [];
  const errors: { source: string; message: string }[] = [];
  const perSourceCounts: Record<string, number> = {};

  settled.forEach((res, i) => {
    const fetcher = FETCHERS[i];
    if (res.status === "fulfilled") {
      perSourceCounts[fetcher.name] = res.value.items.length;
      fresh.push(...res.value.items);
      console.log(`[scrape] ${fetcher.name}: ${res.value.items.length} item(s)`);
    } else {
      const message = res.reason instanceof Error ? res.reason.message : String(res.reason);
      errors.push({ source: fetcher.name, message });
      console.error(`[scrape] ${fetcher.name} FAILED: ${message}`);
    }
  });

  const existing = await readExistingItems();
  const existingNonSeed = existing.filter((i) => !i.id.startsWith("seed-"));
  const merged = dedupe([...fresh, ...existingNonSeed]);

  const filtered = keywordFilter(merged, KEYWORDS);

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const retained = filtered.filter((i) => new Date(i.publishedAt).getTime() >= cutoff);

  const scored = applyScores(retained);
  const capped = capSocial(scored, SOCIAL_CAP);

  capped.sort((a, b) => {
    const ds = (b.score ?? 0) - (a.score ?? 0);
    if (ds !== 0) return ds;
    return b.publishedAt.localeCompare(a.publishedAt);
  });

  const trimmed = capped.slice(0, MAX_TOTAL_ITEMS);

  const report: RunReport = {
    lastRunAt: fetchedAt,
    perSourceCounts,
    errors,
    totalItems: trimmed.length,
  };

  if (dry) {
    console.log(`[scrape] DRY: ${trimmed.length} item(s) would be written`);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  await writeItems(trimmed, { keepSeeds: trimmed.length === 0 });
  await writeMeta(report);
  console.log(`[scrape] wrote ${trimmed.length} item(s) and meta`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

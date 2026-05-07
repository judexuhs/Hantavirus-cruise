/**
 * Shared types for the source-aggregation pipeline.
 *
 * The fetcher contract is intentionally tiny: every source is a plug-in
 * implementing `Fetcher`. Adding a new source means dropping a new file in
 * `fetchers/`, registering it in `run.ts`, and writing a Vitest fixture —
 * no other code in the pipeline or the site needs to change.
 */

export type SourceType = "official" | "news" | "social";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceType: SourceType;
  publishedAt: string;
  fetchedAt: string;
  excerpt?: string;
  tags: string[];
  lang: "en";
  score?: number;
}

export interface FetchContext {
  /** ISO timestamp captured at the start of the run. */
  fetchedAt: string;
  /** Filter terms used by every fetcher to keep results on-topic. */
  keywords: KeywordSpec;
  /** Optional cap to apply per-source so one feed can't drown the rest. */
  maxItemsPerSource?: number;
}

export interface KeywordSpec {
  /** At least one of these words must appear in the title or excerpt. */
  required: string[];
  /** At least one of these context words must also appear. */
  context: string[];
}

export interface Fetcher {
  name: string;
  sourceType: SourceType;
  fetch(ctx: FetchContext): Promise<NewsItem[]>;
}

export interface RunReport {
  lastRunAt: string;
  perSourceCounts: Record<string, number>;
  errors: { source: string; message: string }[];
  totalItems: number;
}

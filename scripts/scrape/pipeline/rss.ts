import { XMLParser } from "fast-xml-parser";
import { Agent, fetch as undiciFetch } from "undici";

/**
 * Minimal RSS / Atom parser used by every fetcher that pulls from a feed.
 * Returns a flat array; fetchers map these into NewsItems with their own
 * source metadata and excerpt cleanup.
 */
export interface RawFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  content?: string;
  source?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

export type FetchFeedOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Extra attempts after the first failure (0 = no retries). */
  retries?: number;
  /** Base delay in ms before retry; multiplied by attempt index (1, 2, …). */
  retryDelayMs?: number;
};

function withTimeout(timeoutMs: number | undefined) {
  if (!timeoutMs) return { signal: undefined as AbortSignal | undefined, clear: () => {} };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

function formatFetchError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: unknown }).cause as
    | { code?: string; message?: string }
    | undefined;
  if (cause?.code) return `${err.message} (${cause.code}${cause.message ? `: ${cause.message}` : ""})`;
  return err.message;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFeedOnce(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number | undefined,
): Promise<RawFeedItem[]> {
  const { signal, clear } = withTimeout(timeoutMs);
  const mergedHeaders = {
    "user-agent": "hantavirus-cruise-tracker/0.1 (+https://github.com/) feed-aggregator",
    accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    ...headers,
  };

  let res: Response;
  try {
    if (timeoutMs !== undefined) {
      const dispatcher = new Agent({
        connectTimeout: timeoutMs,
        headersTimeout: timeoutMs + 15_000,
        bodyTimeout: timeoutMs + 15_000,
      });
      res = (await undiciFetch(url, {
        signal,
        dispatcher,
        headers: mergedHeaders,
      })) as Response;
    } else {
      res = await fetch(url, { signal, headers: mergedHeaders });
    }
  } catch (err) {
    throw new Error(`feed ${url} fetch failed: ${formatFetchError(err)}`);
  } finally {
    clear();
  }
  if (!res.ok) {
    throw new Error(`feed ${url} responded ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  return parseFeed(xml);
}

export async function fetchFeed(url: string): Promise<RawFeedItem[]>;
export async function fetchFeed(url: string, headers: Record<string, string>): Promise<RawFeedItem[]>;
export async function fetchFeed(url: string, options: FetchFeedOptions): Promise<RawFeedItem[]>;
export async function fetchFeed(
  url: string,
  headersOrOptions: Record<string, string> | FetchFeedOptions = {},
): Promise<RawFeedItem[]> {
  const isFetchFeedOptions = (v: unknown): v is FetchFeedOptions =>
    typeof v === "object" &&
    v !== null &&
    ("timeoutMs" in (v as object) ||
      "headers" in (v as object) ||
      "retries" in (v as object) ||
      "retryDelayMs" in (v as object));

  const headers: Record<string, string> = isFetchFeedOptions(headersOrOptions)
    ? headersOrOptions.headers ?? {}
    : headersOrOptions;
  const timeoutMs = isFetchFeedOptions(headersOrOptions) ? headersOrOptions.timeoutMs : undefined;
  const retries = isFetchFeedOptions(headersOrOptions) ? (headersOrOptions.retries ?? 0) : 0;
  const retryDelayMs = isFetchFeedOptions(headersOrOptions) ? (headersOrOptions.retryDelayMs ?? 1500) : 1500;

  let lastErr: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await sleep(retryDelayMs * attempt);
    }
    try {
      return await fetchFeedOnce(url, headers, timeoutMs);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr;
}

export function parseFeed(xml: string): RawFeedItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;

  const channelItems = readPath<unknown[]>(doc, ["rss", "channel", "item"]);
  if (channelItems) {
    return asArray(channelItems).map(rssToRaw);
  }

  const atomEntries = readPath<unknown[]>(doc, ["feed", "entry"]);
  if (atomEntries) {
    return asArray(atomEntries).map(atomToRaw);
  }

  return [];
}

function rssToRaw(raw: unknown): RawFeedItem {
  const it = (raw as Record<string, unknown>) ?? {};
  return {
    title: textOf(it.title) ?? "",
    link: textOf(it.link) ?? "",
    pubDate: textOf(it.pubDate ?? it["dc:date"]),
    description: textOf(it.description),
    content: textOf(it["content:encoded"]),
    source: textOf(it.source),
  };
}

function atomToRaw(raw: unknown): RawFeedItem {
  const it = (raw as Record<string, unknown>) ?? {};
  let link = "";
  const linkNode = it.link;
  if (Array.isArray(linkNode)) {
    const alt = linkNode.find(
      (n): n is { "@_href": string } =>
        typeof n === "object" && n !== null && (n as Record<string, unknown>)["@_href"] !== undefined,
    );
    link = alt ? alt["@_href"] : "";
  } else if (linkNode && typeof linkNode === "object") {
    link = (linkNode as Record<string, string>)["@_href"] ?? "";
  } else if (typeof linkNode === "string") {
    link = linkNode;
  }
  return {
    title: textOf(it.title) ?? "",
    link,
    pubDate: textOf(it.updated ?? it.published),
    description: textOf(it.summary),
    content: textOf(it.content),
  };
}

function textOf(node: unknown): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj["#text"] === "string") return obj["#text"];
    if (typeof obj["@_href"] === "string") return obj["@_href"];
  }
  return undefined;
}

function readPath<T>(obj: unknown, path: string[]): T | undefined {
  let cur: unknown = obj;
  for (const segment of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[segment];
  }
  return cur as T | undefined;
}

function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

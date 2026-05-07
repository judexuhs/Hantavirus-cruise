import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NewsItem, RunReport } from "../types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

export const NEWS_DIR = path.join(ROOT, "src", "content", "news");
export const META_FILE = path.join(ROOT, "src", "data", "news-meta.json");

/**
 * Read existing on-disk items so a fetch failure doesn't wipe data — the
 * pipeline merges new items into the previous corpus and trims old ones.
 */
export async function readExistingItems(): Promise<NewsItem[]> {
  await fs.mkdir(NEWS_DIR, { recursive: true });
  const files = (await fs.readdir(NEWS_DIR)).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_"),
  );
  const out: NewsItem[] = [];
  for (const f of files) {
    try {
      const raw = await fs.readFile(path.join(NEWS_DIR, f), "utf8");
      const parsed = JSON.parse(raw) as NewsItem;
      out.push(parsed);
    } catch {
      // skip malformed files; the build will surface the error separately
    }
  }
  return out;
}

/**
 * Write the current corpus, removing files that no longer correspond to a
 * kept item. Filenames are derived from id so they're stable across runs.
 */
export async function writeItems(
  items: NewsItem[],
  options: { keepSeeds?: boolean } = {},
): Promise<void> {
  await fs.mkdir(NEWS_DIR, { recursive: true });
  const existing = (await fs.readdir(NEWS_DIR)).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_"),
  );
  const wanted = new Set<string>();

  for (const item of items) {
    const filename = `${item.id}.json`;
    wanted.add(filename);
    await fs.writeFile(
      path.join(NEWS_DIR, filename),
      JSON.stringify(item, null, 2) + "\n",
      "utf8",
    );
  }

  for (const f of existing) {
    if (wanted.has(f)) continue;
    if (options.keepSeeds && f.startsWith("seed-")) continue;
    await fs.unlink(path.join(NEWS_DIR, f)).catch(() => {});
  }
}

export async function writeMeta(report: RunReport): Promise<void> {
  await fs.writeFile(
    META_FILE,
    JSON.stringify(
      {
        ...report,
        note: "Updated automatically by scripts/scrape/run.ts; do not edit by hand.",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

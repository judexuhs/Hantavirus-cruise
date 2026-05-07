import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeed } from "./rss.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.resolve(__dirname, "..", "__fixtures__");

async function load(name: string): Promise<string> {
  return fs.readFile(path.join(FIX, name), "utf8");
}

describe("parseFeed (RSS)", () => {
  it("parses CDC HAN fixture", async () => {
    const xml = await load("cdc-han.xml");
    const items = parseFeed(xml);
    expect(items.length).toBe(2);
    expect(items[0].title).toMatch(/Hantavirus/);
    expect(items[0].link).toMatch(/cdc\.gov/);
    expect(items[0].pubDate).toBeDefined();
  });

  it("parses Google News fixture", async () => {
    const xml = await load("google-news.xml");
    const items = parseFeed(xml);
    expect(items.length).toBe(2);
    expect(items[0].title).toMatch(/Cruise line confirms hantavirus/);
  });
});

describe("parseFeed (Atom)", () => {
  it("parses WHO DON fixture and extracts the alternate link", async () => {
    const xml = await load("who-don.xml");
    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toMatch(/Hantavirus disease/);
    expect(items[0].link).toMatch(/who\.int/);
  });
});

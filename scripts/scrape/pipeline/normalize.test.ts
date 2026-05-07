import { describe, it, expect } from "vitest";
import { canonicalUrl, stableId, toExcerpt, buildItem } from "./normalize.ts";

describe("canonicalUrl", () => {
  it("strips utm and other tracking params", () => {
    const url = "https://example.com/x?id=1&utm_source=rss&utm_medium=feed&fbclid=abc";
    expect(canonicalUrl(url)).toBe("https://example.com/x?id=1");
  });

  it("removes hash fragments", () => {
    expect(canonicalUrl("https://example.com/x#part")).toBe("https://example.com/x");
  });

  it("unwraps Google News redirect URLs", () => {
    const wrapped =
      "https://news.google.com/articles/abc?url=https%3A%2F%2Forig.example%2Fa%3Futm_source%3Dx";
    expect(canonicalUrl(wrapped)).toBe("https://orig.example/a");
  });

  it("returns input unchanged when not parsable", () => {
    expect(canonicalUrl("not a url")).toBe("not a url");
  });
});

describe("stableId", () => {
  it("is deterministic for the same canonical url", () => {
    const a = stableId("https://example.com/x?utm_source=rss");
    const b = stableId("https://example.com/x");
    expect(a).toBe(b);
  });

  it("differs for different urls", () => {
    expect(stableId("https://example.com/a")).not.toBe(stableId("https://example.com/b"));
  });
});

describe("toExcerpt", () => {
  it("strips html and trims", () => {
    expect(toExcerpt("<p>Hello <b>world</b>.</p>")).toBe("Hello world.");
  });

  it("decodes basic entities", () => {
    expect(toExcerpt("Tom &amp; Jerry &lt;3 &quot;cheese&quot;")).toBe("Tom & Jerry <3 \"cheese\"");
  });

  it("respects max length", () => {
    const text = "a".repeat(500);
    const out = toExcerpt(text, 100);
    expect(out?.length).toBe(100);
    expect(out?.endsWith("…")).toBe(true);
  });

  it("returns undefined for empty input", () => {
    expect(toExcerpt(undefined)).toBeUndefined();
    expect(toExcerpt("")).toBeUndefined();
    expect(toExcerpt("   ")).toBeUndefined();
  });
});

describe("buildItem", () => {
  it("normalizes timestamps to ISO and sets defaults", () => {
    const item = buildItem({
      title: "  Headline  ",
      url: "https://example.com/a?utm_source=x",
      source: "Example",
      sourceType: "news",
      publishedAt: "Tue, 06 May 2026 09:00:00 GMT",
      fetchedAt: "2026-05-07T00:00:00.000Z",
    });
    expect(item.title).toBe("Headline");
    expect(item.url).toBe("https://example.com/a");
    expect(item.publishedAt).toBe("2026-05-06T09:00:00.000Z");
    expect(item.lang).toBe("en");
    expect(item.tags).toEqual([]);
    expect(item.id).toHaveLength(16);
  });
});

import { describe, it, expect } from "vitest";
import { score, capSocial, applyScores } from "./score.ts";
import type { NewsItem } from "../types.ts";

const make = (over: Partial<NewsItem>): NewsItem => ({
  id: Math.random().toString(36),
  title: "t",
  url: "https://example.com/",
  source: "X",
  sourceType: "news",
  publishedAt: "2026-05-06T00:00:00Z",
  fetchedAt: "2026-05-06T00:00:00Z",
  tags: [],
  lang: "en",
  ...over,
});

describe("score", () => {
  it("ranks official > news > social for same age", () => {
    const now = new Date("2026-05-06T00:00:00Z");
    const o = score(make({ sourceType: "official" }), now);
    const n = score(make({ sourceType: "news" }), now);
    const s = score(make({ sourceType: "social" }), now);
    expect(o).toBeGreaterThan(n);
    expect(n).toBeGreaterThan(s);
  });

  it("decays with age", () => {
    const now = new Date("2026-05-20T00:00:00Z");
    const fresh = score(
      make({ sourceType: "official", publishedAt: "2026-05-19T00:00:00Z" }),
      now,
    );
    const old = score(
      make({ sourceType: "official", publishedAt: "2026-05-01T00:00:00Z" }),
      now,
    );
    expect(fresh).toBeGreaterThan(old);
  });
});

describe("capSocial", () => {
  it("keeps all non-social items and only top-N social", () => {
    const items = [
      ...Array.from({ length: 5 }, (_, i) =>
        make({ id: `n${i}`, sourceType: "news", score: 0.5 }),
      ),
      ...Array.from({ length: 30 }, (_, i) =>
        make({ id: `s${i}`, sourceType: "social", score: 0.3 - i * 0.001 }),
      ),
    ];
    const capped = capSocial(applyScores(items), 5);
    const social = capped.filter((i) => i.sourceType === "social");
    const news = capped.filter((i) => i.sourceType === "news");
    expect(news).toHaveLength(5);
    expect(social).toHaveLength(5);
  });
});

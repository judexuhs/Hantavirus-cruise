import { describe, it, expect } from "vitest";
import { dedupe, keywordFilter } from "./dedupe.ts";
import type { NewsItem } from "../types.ts";

const make = (over: Partial<NewsItem>): NewsItem => ({
  id: "id1",
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

describe("dedupe", () => {
  it("collapses duplicates and prefers higher-trust source", () => {
    const items = [
      make({ id: "x", source: "Reddit", sourceType: "social" }),
      make({ id: "x", source: "WHO", sourceType: "official" }),
      make({ id: "x", source: "Reuters", sourceType: "news" }),
    ];
    const out = dedupe(items);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("WHO");
  });

  it("keeps unrelated items", () => {
    const out = dedupe([make({ id: "a" }), make({ id: "b" })]);
    expect(out).toHaveLength(2);
  });
});

describe("keywordFilter", () => {
  const spec = { required: ["hantavirus"], context: ["cruise", "ship"] };

  it("keeps items matching required + context", () => {
    const out = keywordFilter(
      [
        make({ id: "1", title: "Hantavirus on cruise ship" }),
        make({ id: "2", title: "Hantavirus in rural area" }),
        make({ id: "3", title: "Cruise ship sails" }),
      ],
      spec,
    );
    expect(out.map((i) => i.id)).toEqual(["1"]);
  });

  it("matches case-insensitively in excerpt too", () => {
    const out = keywordFilter(
      [make({ id: "1", title: "Outbreak", excerpt: "HANTAVIRUS on a CRUISE" })],
      spec,
    );
    expect(out).toHaveLength(1);
  });
});

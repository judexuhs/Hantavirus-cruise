import { defineCollection, z } from "astro:content";

/**
 * Content collections — single typed source of truth for everything the
 * UI renders. Keep this file the only place schemas live; pages import
 * the inferred types instead of redeclaring shapes.
 */

const sourceType = z.enum(["official", "news", "social"]);

const newsSchema = z.object({
  id: z.string().min(8),
  title: z.string(),
  url: z.string().url(),
  source: z.string(),
  sourceType,
  publishedAt: z.string().datetime({ offset: true }),
  fetchedAt: z.string().datetime({ offset: true }),
  excerpt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  lang: z.literal("en").default("en"),
  score: z.number().optional(),
});

const news = defineCollection({
  type: "data",
  schema: newsSchema,
});

const timelineSchema = z.object({
  date: z.string().datetime({ offset: true }),
  title: z.string(),
  body: z.string(),
  category: z.enum([
    "voyage",
    "detection",
    "official_response",
    "case_update",
    "death",
    "advisory",
    "contained",
    "other",
  ]),
  sources: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  status: z.enum(["confirmed", "pending"]).default("confirmed"),
});

const timeline = defineCollection({
  type: "data",
  schema: timelineSchema,
});

const faqSchema = z.object({
  question: z.string(),
  order: z.number().default(100),
  tags: z.array(z.string()).default([]),
});

const faq = defineCollection({
  type: "content",
  schema: faqSchema,
});

const explainerSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().default(100),
});

const explainer = defineCollection({
  type: "content",
  schema: explainerSchema,
});

export const collections = {
  news,
  timeline,
  faq,
  explainer,
};

export type NewsType = z.infer<typeof newsSchema>;
export type TimelineType = z.infer<typeof timelineSchema>;
export type SourceType = z.infer<typeof sourceType>;

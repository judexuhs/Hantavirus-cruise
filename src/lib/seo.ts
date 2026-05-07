/**
 * Structured-data helpers. Each builder returns a plain object that is
 * stringified into a <script type="application/ld+json"> tag by the SEO
 * component. Keeping these as pure functions makes them trivially testable
 * and lets pages compose richer payloads when needed.
 */

import type { CollectionEntry } from "astro:content";
import { stats, cruise, latestSnapshot } from "~/data";

const SITE_NAME = "Hantavirus Cruise Tracker";
const SITE_LOGO_PATH = "/logo.svg";

interface BuildContext {
  /** Absolute origin, e.g. https://hondius.example.com */
  origin: string;
}

export function websiteJsonLd(ctx: BuildContext) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: ctx.origin + "/",
    description:
      "Independent, fact-first tracker of the Hantavirus cruise outbreak (MV Hondius, 2026). Timeline, case counts, and aggregated coverage from CDC, WHO, ECDC, Oceanwide Expeditions, and major newsrooms.",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: ctx.origin + "/",
      logo: {
        "@type": "ImageObject",
        url: ctx.origin + SITE_LOGO_PATH,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: ctx.origin + "/sources/?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(ctx: BuildContext) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: ctx.origin + "/",
    logo: ctx.origin + SITE_LOGO_PATH,
    sameAs: ["https://github.com/judexuhs/Hantavirus-cruise"],
  };
}

/**
 * The outbreak itself, modeled as a MedicalCondition + Event combination.
 * Search engines pick this up for entity panels.
 */
export function outbreakJsonLd(ctx: BuildContext) {
  const snap = latestSnapshot();
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": ctx.origin + "/#outbreak",
    name: stats.outbreak.name,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    startDate: cruise.voyage.departed ?? undefined,
    location: {
      "@type": "Place",
      name: stats.outbreak.shipName,
      additionalType: "https://schema.org/Vehicle",
    },
    organizer: {
      "@type": "Organization",
      name: stats.outbreak.operator,
    },
    about: {
      "@type": "MedicalCondition",
      name: "Hantavirus disease",
      code: { "@type": "MedicalCode", codeValue: "ICD-10:A98.5", codingSystem: "ICD-10" },
    },
    description: snap?.note,
    url: ctx.origin + "/",
  };
}

export function breadcrumbsJsonLd(ctx: BuildContext, crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: ctx.origin + c.path,
    })),
  };
}

export function faqJsonLd(entries: CollectionEntry<"faq">[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.data.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.body.replace(/\s+/g, " ").slice(0, 1500).trim(),
      },
    })),
  };
}

export function timelineJsonLd(
  ctx: BuildContext,
  entries: CollectionEntry<"timeline">[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: stats.outbreak.name + " — timeline",
    url: ctx.origin + "/timeline/",
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "NewsArticle",
        headline: e.data.title,
        datePublished: e.data.date,
        articleBody: e.data.body,
        inLanguage: "en",
        isAccessibleForFree: true,
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME },
        mainEntityOfPage: ctx.origin + "/timeline/",
        ...(e.data.sources[0]
          ? { sameAs: e.data.sources.map((s) => s.url) }
          : {}),
      },
    })),
  };
}

export function newsCollectionJsonLd(
  ctx: BuildContext,
  items: { title: string; url: string; publishedAt: string; source: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: SITE_NAME + " — Sources",
    url: ctx.origin + "/sources/",
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: ctx.origin + "/" },
    hasPart: items.slice(0, 25).map((i) => ({
      "@type": "NewsArticle",
      headline: i.title,
      url: i.url,
      datePublished: i.publishedAt,
      publisher: { "@type": "Organization", name: i.source },
    })),
  };
}

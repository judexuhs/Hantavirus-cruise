/**
 * Pure formatting helpers shared between server-rendered Astro components
 * and the (very small) client islands. Keep them deterministic and dep-free.
 */

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const ISO_DATE = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const ISO_DATETIME = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
  timeZoneName: "short",
});

export function formatDate(iso: string): string {
  return ISO_DATE.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return ISO_DATETIME.format(new Date(iso));
}

export function relativeFromNow(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((then - now.getTime()) / 1000);
  const ranges: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, secs] of ranges) {
    if (Math.abs(diffSec) >= secs || unit === "second") {
      return RTF.format(Math.round(diffSec / secs), unit);
    }
  }
  return RTF.format(0, "second");
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/**
 * Hostname for an outbound link, used as a small dim caption on news cards.
 */
export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

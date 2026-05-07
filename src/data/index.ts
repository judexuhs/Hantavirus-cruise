/**
 * Typed accessors for hand-curated data. Pages import from here instead
 * of reading JSON inline so the shape is enforced and the storage backend
 * can be swapped (file -> CMS -> DB) without touching components.
 */
import statsRaw from "./stats.json";
import cruiseRaw from "./cruise.json";
import newsMetaRaw from "./news-meta.json";
import cohortRaw from "./cohort.json";

export type OutbreakStatus = "active" | "monitoring" | "contained" | "unknown";

export interface StatsSnapshot {
  asOf: string;
  confirmed: number;
  suspected: number;
  recovered: number;
  deaths: number;
  underObservation: number;
  note?: string;
}

export interface OutbreakMeta {
  name: string;
  shipName: string;
  operator: string;
  status: OutbreakStatus;
  statusUpdatedAt: string;
}

export interface StatsFile {
  outbreak: OutbreakMeta;
  snapshots: StatsSnapshot[];
}

export interface PortStop {
  name: string;
  country: string;
  arrival: string | null;
  departure: string | null;
  lat: number | null;
  lon: number | null;
  note?: string;
}

export interface CruiseFile {
  ship: {
    name: string;
    operator: string;
    passengers: number | null;
    crew: number | null;
    lengthM: number | null;
    imo: string | null;
  };
  voyage: {
    departed: string | null;
    scheduledReturn: string | null;
    currentStatus: string;
  };
  ports: PortStop[];
  disclaimer: string;
}

export interface NewsMeta {
  lastRunAt: string;
  perSourceCounts: Record<string, number>;
  errors: { source: string; message: string }[];
  totalItems: number;
  note?: string;
}

export interface CohortBreakdown {
  asOf: string;
  totals: {
    passengers: number;
    crew: number;
    passengerCountries: number;
    crewCountries: number;
    totalCountries: number;
  };
  passengers: { country: string; count: number }[];
  crew: { country: string; count: number }[];
  source: { label: string; url: string };
}

export const stats = statsRaw as StatsFile;
export const cruise = cruiseRaw as CruiseFile;
export const newsMeta = newsMetaRaw as NewsMeta;
export const cohort = cohortRaw as CohortBreakdown;

export function latestSnapshot(): StatsSnapshot | undefined {
  if (stats.snapshots.length === 0) return undefined;
  return [...stats.snapshots].sort((a, b) => b.asOf.localeCompare(a.asOf))[0];
}

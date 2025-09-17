import { BreakdownRow, Diff, Grain, KpiPoint, KpiResponse } from "../types";
import { alignYoySeries, computeDiff, sumSeries } from "../yoy";

type SeedConfig = {
  base: number;
  seasonalityByMonth?: number[]; // 12 length multipliers
  noise?: number; // 0..1
};

export function generateDateRange(start: string, end: string, grain: Grain = "day"): string[] {
  // Always generate daily dates; higher-level grains will be aggregated from these.
  const out: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function generateTimeseries(range: { start: string; end: string; grain?: Grain }, seed: SeedConfig): KpiPoint[] {
  // Ignore input grain here; always produce daily series and aggregate later.
  const dates = generateDateRange(range.start, range.end, "day");
  const months = seed.seasonalityByMonth || [1, 0.95, 1.02, 1.04, 1.05, 1.01, 0.85, 0.98, 1.03, 1.04, 1.02, 1.01];
  const noise = seed.noise ?? 0.08;
  return dates.map((d) => {
    const dt = new Date(d);
    const m = dt.getUTCMonth();
    const seasonal = months[m] || 1;
    // Deterministic pseudo-random per date to keep Day/Week/Month consistent across requests
    const r = deterministicRandom(d);
    const jitter = 1 + (r * 2 - 1) * noise;
    const value = Math.max(0, Math.round(seed.base * seasonal * jitter));
    return { date: d, value };
  });
}

export function aggregate(series: KpiPoint[], grain: Grain): KpiPoint[] {
  if (grain === "day") {
    // Ensure sorted ascending by date
    return [...series].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  const buckets = new Map<string, number>();
  for (const p of series) {
    const dt = new Date(p.date);
    let key = p.date;
    if (grain === "week") {
      // Bucket to Monday of the week (week starts on Monday)
      const monday = startOfWeekMonday(dt);
      key = monday.toISOString().slice(0, 10);
    } else if (grain === "month") {
      // First day of the month
      const first = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1));
      key = first.toISOString().slice(0, 10);
    }
    buckets.set(key, (buckets.get(key) || 0) + p.value);
  }
  return Array.from(buckets.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function startOfWeekMonday(date: Date): Date {
  // Create a UTC date at 00:00 and move back to Monday
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const diff = (day === 0 ? -6 : 1 - day); // if Sunday, go back 6 days; else back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function deterministicRandom(key: string): number {
  // Simple string hash → [0,1). Not cryptographic, just stable.
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  // Convert to positive 32-bit and normalize
  const x = (h >>> 0) / 4294967295;
  return x;
}

export function computeYoy(currentSeries: KpiPoint[], previousSeries: KpiPoint[]): { summary: Diff; pairs: Array<{ current?: KpiPoint; previous?: KpiPoint }>; } {
  const pairs = alignYoySeries(currentSeries, previousSeries);
  const currentTotal = sumSeries(currentSeries);
  const previousTotal = sumSeries(previousSeries);
  return { summary: computeDiff(currentTotal, previousTotal), pairs };
}

export function buildBreakdown(keys: string[], total: number): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  let remaining = total;
  const parts = keys.length;
  for (let i = 0; i < parts; i++) {
    const isLast = i === parts - 1;
    const portion = isLast ? remaining : Math.round((total / parts) * (0.7 + Math.random() * 0.6));
    remaining -= portion;
    rows.push({ key: keys[i], value: Math.max(0, portion), yoyPct: Math.round((Math.random() * 20 - 10) * 100) / 100 });
  }
  return rows.sort((a, b) => b.value - a.value);
}

export function buildKpiResponse(metric: string, series: KpiPoint[], previous?: KpiPoint[], breakdownKeys?: string[], notes?: string[]): KpiResponse {
  const currentAgg = sumSeries(series);
  let summary: Diff = { current: currentAgg, prev: 0, yoyPct: 0 };
  if (previous) {
    const prevAgg = sumSeries(previous);
    summary = computeDiff(currentAgg, prevAgg);
  }
  const breakdown = breakdownKeys ? buildBreakdown(breakdownKeys, currentAgg) : undefined;
  return {
    meta: { source: 'mock', metric, dims: [] },
    summary,
    timeseries: series,
    breakdown,
    notes,
  };
}



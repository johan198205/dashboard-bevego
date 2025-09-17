import { BreakdownRow, Diff, Grain, KpiPoint, KpiResponse } from "../types";
import { alignYoySeries, computeDiff, sumSeries } from "../yoy";

type SeedConfig = {
  base: number;
  seasonalityByMonth?: number[]; // 12 length multipliers
  noise?: number; // 0..1
};

export function generateDateRange(start: string, end: string, grain: Grain = "day"): string[] {
  const out: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    out.push(cursor.toISOString().slice(0, 10));
    if (grain === "day") cursor.setDate(cursor.getDate() + 1);
    else if (grain === "week") cursor.setDate(cursor.getDate() + 7);
    else if (grain === "month") cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export function generateTimeseries(range: { start: string; end: string; grain?: Grain }, seed: SeedConfig): KpiPoint[] {
  const dates = generateDateRange(range.start, range.end, range.grain || "day");
  const months = seed.seasonalityByMonth || [1, 0.95, 1.02, 1.04, 1.05, 1.01, 0.85, 0.98, 1.03, 1.04, 1.02, 1.01];
  const noise = seed.noise ?? 0.08;
  return dates.map((d) => {
    const dt = new Date(d);
    const m = dt.getUTCMonth();
    const seasonal = months[m] || 1;
    const jitter = 1 + (Math.random() * 2 - 1) * noise;
    const value = Math.max(0, Math.round(seed.base * seasonal * jitter));
    return { date: d, value };
  });
}

export function aggregate(series: KpiPoint[], grain: Grain): KpiPoint[] {
  if (grain === "day") return series;
  const buckets = new Map<string, number>();
  for (const p of series) {
    const dt = new Date(p.date);
    let key = p.date;
    if (grain === "week") {
      const weekKey = `${dt.getUTCFullYear()}-W${getIsoWeek(dt).toString().padStart(2, "0")}`;
      key = weekKey;
    } else if (grain === "month") {
      key = `${dt.getUTCFullYear()}-${(dt.getUTCMonth() + 1).toString().padStart(2, "0")}`;
    }
    buckets.set(key, (buckets.get(key) || 0) + p.value);
  }
  return Array.from(buckets.entries()).map(([date, value]) => ({ date, value }));
}

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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



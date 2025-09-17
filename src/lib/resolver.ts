import { type KpiResponse, type Params, type Grain, type Filters } from "./types";
import { buildKpiResponse, generateTimeseries, aggregate } from "./mockData/generators";

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function previousYoyRange(range: { start: string; end: string }) {
  return { start: addYears(range.start, -1), end: addYears(range.end, -1) };
}

function ensureGrain(grain?: Grain): Grain { return grain || "day"; }

// Proportional mock scaling based on UI filters
const AUDIENCE_WEIGHTS: Record<string, number> = {
  "Styrelse": 0.1,
  "Medlem": 0.7,
  "Leverantör": 0.1,
  "Förvaltare": 0.1,
};
const DEVICE_WEIGHTS: Record<string, number> = {
  "Desktop": 0.6,
  "Mobil": 0.3,
  "Surfplatta": 0.1,
};
const CHANNEL_WEIGHTS: Record<string, number> = {
  "Direkt": 0.35,
  "Organiskt": 0.4,
  "Kampanj": 0.15,
  "E-post": 0.1,
};

function weightSum(values: string[] | undefined, weights: Record<string, number>): number {
  if (!values || values.length === 0) return 1;
  return values.reduce((acc, v) => acc + (weights[v] ?? 0), 0);
}

function computeScale(filters?: Filters): number {
  if (!filters) return 1;
  const a = weightSum(filters.audience, AUDIENCE_WEIGHTS);
  const d = weightSum(filters.device, DEVICE_WEIGHTS);
  const c = weightSum(filters.channel, CHANNEL_WEIGHTS);
  return a * d * c;
}

function scaleSeries(series: { date: string; value: number }[], factor: number) {
  if (factor === 1) return series;
  return series.map((p) => ({ ...p, value: Math.round(p.value * factor) }));
}

export async function getKpi(params: Params): Promise<KpiResponse> {
  const { metric, range, filters } = params;
  const grain = ensureGrain(range.grain);

  // Note: All data is mock. CONNECT GA4 HERE LATER by swapping implementation per metric.
  const scale = computeScale(filters);
  if (metric === "mau") {
    const currentRaw = generateTimeseries({ start: range.start, end: range.end, grain }, { base: 1200, noise: 0.1 });
    const current = scaleSeries(currentRaw, scale);
    const prevRange = previousYoyRange(range);
    const previous = range.compareYoy ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 1050, noise: 0.1 }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    const breakdown = ["Direkt", "Organiskt", "Kampanj", "E-post"];
    const dims = filters?.channel && filters.channel.length > 0 ? breakdown.filter((c) => filters.channel?.includes(c)) : breakdown;
    return buildKpiResponse("mau", series, prevAgg, dims, ["Källa: Mockdata (MAU)"]);
  }

  if (metric === "pageviews") {
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 5400, noise: 0.12 }), scale);
    const prevRange = previousYoyRange(range);
    const previous = range.compareYoy ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 5000, noise: 0.12 }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    const breakdown = ["Direkt", "Organiskt", "Kampanj", "E-post"];
    const dims = filters?.channel && filters.channel.length > 0 ? breakdown.filter((c) => filters.channel?.includes(c)) : breakdown;
    return buildKpiResponse("pageviews", series, prevAgg, dims, ["Källa: Mockdata (Sidvisningar)"]);
  }

  if (metric === "tasks") {
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 750, noise: 0.15 }), scale);
    const prevRange = previousYoyRange(range);
    const previous = range.compareYoy ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 680, noise: 0.15 }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    return buildKpiResponse("tasks", series, prevAgg, [
      "task_submitted_fault_report",
      "task_invoice_attested",
      "task_legal_booking",
      "task_news_created",
      "task_expense_uploaded",
      "task_doc_uploaded",
      "task_doc_downloaded"
    ], ["Rate = antal / MAU för perioden (beräknas i widget)", "Källa: Mockdata (Tasks)"]);
  }

  if (metric === "features") {
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 950, noise: 0.14 }), scale);
    const prevRange = previousYoyRange(range);
    const previous = range.compareYoy ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 900, noise: 0.14 }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    return buildKpiResponse("features", series, prevAgg, [
      "feature_read_report",
      "feature_read_news",
      "feature_view_faq",
      "feature_view_vendor_invoice",
      "feature_visit_boardroom",
      "feature_view_avi"
    ], ["Källa: Mockdata (Funktioner)"]);
  }

  if (metric === "ndi") {
    // 6 quarters of dummy NDI values 0..100
    const now = new Date(range.end);
    const quarters: { date: string; value: number }[] = [];
    const currentQ = Math.floor(now.getUTCMonth() / 3);
    for (let i = 5; i >= 0; i--) {
      const qIndex = currentQ - i;
      const qDate = new Date(Date.UTC(now.getUTCFullYear(), (qIndex) * 3, 1));
      while (qDate > now) qDate.setUTCMonth(qDate.getUTCMonth() - 3);
      const label = `${qDate.getUTCFullYear()}-Q${Math.floor(qDate.getUTCMonth() / 3) + 1}`;
      quarters.push({ date: label, value: Math.round(60 + Math.random() * 30) });
    }
    const series = quarters.map((q) => ({ date: q.date, value: q.value }));
    // previous 6 quarters for YoY comparison
    const prevSeries = range.compareYoy ? quarters.map((q) => ({ date: q.date, value: Math.round(q.value * (0.9 + Math.random() * 0.2)) })) : undefined;
    return buildKpiResponse("ndi", series, prevSeries, ["Styrelse", "Medlem", "Förvaltare"], ["NDI är dummyvärden på kvartalsnivå", "Källa: Mockdata (NDI)"]);
  }

  if (metric === "perf") {
    // Static placeholders
    const series = [{ date: params.range.start, value: 1 }];
    return {
      meta: { source: "mock", metric: "perf", dims: [] },
      summary: { current: 1, prev: 1, yoyPct: 0 },
      timeseries: series,
      notes: ["Svarstid, Uptime och WCAG är placeholders", "Källa: Mockdata (Prestanda)"]
    };
  }

  // Fallback
  return {
    meta: { source: "mock", metric, dims: [] },
    summary: { current: 0, prev: 0, yoyPct: 0 },
    timeseries: [],
    notes: ["Okänt mått", "Källa: Mockdata"]
  };
}

// Temporary shim to avoid breaking existing imports in the template
export type DataSource = "ga4" | "bq";
export type SessionsKpiInput = { startDate: string; endDate: string; dataSource: DataSource };
export type SessionsKpiResult = { total_sessions: number; source_label: "Mock" };
export async function getSessionsKpi(input: SessionsKpiInput): Promise<SessionsKpiResult> {
  const res = await getKpi({ metric: "mau", range: { start: input.startDate, end: input.endDate, compareYoy: false, grain: "day" } });
  return { total_sessions: res.summary.current, source_label: "Mock" };
}


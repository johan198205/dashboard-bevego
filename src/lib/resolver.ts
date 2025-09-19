import { type KpiResponse, type Params, type Grain, type Filters, type KpiPoint } from "./types";
import { buildKpiResponse, generateTimeseries, aggregate } from "./mockData/generators";

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function previousYoyRange(range: { start: string; end: string }) {
  return { start: addYears(range.start, -1), end: addYears(range.end, -1) };
}

function previousPeriodRange(range: { start: string; end: string }): { start: string; end: string } {
  // Compute duration in days and subtract that from start
  const start = new Date(range.start);
  const end = new Date(range.end);
  const lengthDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (lengthDays - 1));
  return { start: prevStart.toISOString().slice(0, 10), end: prevEnd.toISOString().slice(0, 10) };
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
  const comparisonMode: 'none' | 'yoy' | 'prev' = (range.comparisonMode as any) || (range.compareYoy ? 'yoy' : 'none');

  // Note: All data is mock. CONNECT GA4 HERE LATER by swapping implementation per metric.
  const scale = computeScale(filters);
  if (metric === "mau") {
    const currentRaw = generateTimeseries({ start: range.start, end: range.end, grain }, { base: 1200, noise: 0.1, seedKey: "mau" });
    const current = scaleSeries(currentRaw, scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 1050, noise: 0.1, seedKey: "mau_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    const breakdown = [
      "Direkt",
      "Organiskt",
      "Kampanj",
      "E-post",
      "Referral",
      "Social",
      "Betald sök",
      "Display",
      "Video",
      "Övrigt",
    ];
    const dims = filters?.channel && filters.channel.length > 0 ? breakdown.filter((c) => filters.channel?.includes(c)) : breakdown;
    return buildKpiResponse("mau", series, prevAgg, dims, ["Källa: Mockdata (MAU)"]);
  }

  if (metric === "pageviews") {
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 5400, noise: 0.12, seedKey: "pageviews" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 5000, noise: 0.12, seedKey: "pageviews_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    const breakdown = [
      "Direkt",
      "Organiskt",
      "Kampanj",
      "E-post",
      "Referral",
      "Social",
      "Betald sök",
      "Display",
      "Video",
      "Övrigt",
    ];
    const dims = filters?.channel && filters.channel.length > 0 ? breakdown.filter((c) => filters.channel?.includes(c)) : breakdown;
    return buildKpiResponse("pageviews", series, prevAgg, dims, ["Källa: Mockdata (Sidvisningar)"]);
  }

  if (metric === "tasks") {
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 750, noise: 0.15, seedKey: "tasks" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 680, noise: 0.15, seedKey: "tasks_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    return buildKpiResponse("tasks", series, prevAgg, [
      "task_submitted_fault_report",
      "task_invoice_attested",
      "task_legal_booking",
      "task_news_created",
      "task_expense_uploaded",
      "task_doc_uploaded",
      "task_doc_downloaded",
      "task_profile_updated",
      "task_consent_updated",
      "task_contacted_support",
    ], ["Rate = antal / MAU för perioden (beräknas i widget)", "Källa: Mockdata (Tasks)"]);
  }

  if (metric === "features") {
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 950, noise: 0.14, seedKey: "features" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 900, noise: 0.14, seedKey: "features_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    return buildKpiResponse("features", series, prevAgg, [
      "feature_read_report",
      "feature_read_news",
      "feature_view_faq",
      "feature_view_vendor_invoice",
      "feature_visit_boardroom",
      "feature_view_avi",
      "feature_download_document",
      "feature_search",
      "feature_notifications",
      "feature_settings",
    ], ["Källa: Mockdata (Funktioner)"]);
  }

  if (metric === "ndi") {
    // Generate daily NDI values 0..100 for the date range
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 75, noise: 0.08, seedKey: "ndi" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 70, noise: 0.08, seedKey: "ndi_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    return buildKpiResponse("ndi", series, prevAgg, ["Styrelse", "Medlem", "Förvaltare"], ["NDI är dummyvärden på daglig nivå", "Källa: Mockdata (NDI)"]);
  }

  if (metric === "tasks_rate") {
    // Calculate tasks rate as percentage of MAU using direct mock data
    const tasksCurrent = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 750, noise: 0.15, seedKey: "tasks" }), scale);
    const mauCurrent = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 1200, noise: 0.1, seedKey: "mau" }), scale);
    
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const tasksPrev = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 680, noise: 0.15, seedKey: "tasks_prev" }), scale) : undefined;
    const mauPrev = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 1050, noise: 0.1, seedKey: "mau_prev" }), scale) : undefined;
    
    const tasksAgg = aggregate(tasksCurrent, grain);
    const mauAgg = aggregate(mauCurrent, grain);
    const tasksPrevAgg = tasksPrev ? aggregate(tasksPrev, grain) : undefined;
    const mauPrevAgg = mauPrev ? aggregate(mauPrev, grain) : undefined;
    
    const currentRate = mauAgg.reduce((sum, p) => sum + p.value, 0) ? (tasksAgg.reduce((sum, p) => sum + p.value, 0) / mauAgg.reduce((sum, p) => sum + p.value, 0)) * 100 : 0;
    const prevRate = mauPrevAgg && tasksPrevAgg ? (mauPrevAgg.reduce((sum, p) => sum + p.value, 0) ? (tasksPrevAgg.reduce((sum, p) => sum + p.value, 0) / mauPrevAgg.reduce((sum, p) => sum + p.value, 0)) * 100 : 0) : 0;
    const yoyPct = prevRate ? ((currentRate - prevRate) / Math.abs(prevRate)) * 100 : 0;
    
    // Generate rate timeseries
    const rateSeries = tasksAgg.map((taskPoint, i) => {
      const mauPoint = mauAgg[i];
      const rate = mauPoint?.value ? (taskPoint.value / mauPoint.value) * 100 : 0;
      return { date: taskPoint.date, value: Math.max(0, Math.min(100, rate)) };
    });
    
    return {
      meta: { source: "mock", metric: "tasks_rate", dims: [] },
      summary: { current: currentRate, prev: prevRate, yoyPct },
      timeseries: rateSeries,
      notes: ["Rate = antal tasks / MAU för perioden", "Källa: Mockdata (Tasks Rate)"]
    };
  }

  if (metric === "features_rate") {
    // Calculate features rate as percentage of MAU using direct mock data
    const featuresCurrent = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 950, noise: 0.14, seedKey: "features" }), scale);
    const mauCurrent = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 1200, noise: 0.1, seedKey: "mau" }), scale);
    
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const featuresPrev = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 900, noise: 0.14, seedKey: "features_prev" }), scale) : undefined;
    const mauPrev = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 1050, noise: 0.1, seedKey: "mau_prev" }), scale) : undefined;
    
    const featuresAgg = aggregate(featuresCurrent, grain);
    const mauAgg = aggregate(mauCurrent, grain);
    const featuresPrevAgg = featuresPrev ? aggregate(featuresPrev, grain) : undefined;
    const mauPrevAgg = mauPrev ? aggregate(mauPrev, grain) : undefined;
    
    const currentRate = mauAgg.reduce((sum, p) => sum + p.value, 0) ? (featuresAgg.reduce((sum, p) => sum + p.value, 0) / mauAgg.reduce((sum, p) => sum + p.value, 0)) * 100 : 0;
    const prevRate = mauPrevAgg && featuresPrevAgg ? (mauPrevAgg.reduce((sum, p) => sum + p.value, 0) ? (featuresPrevAgg.reduce((sum, p) => sum + p.value, 0) / mauPrevAgg.reduce((sum, p) => sum + p.value, 0)) * 100 : 0) : 0;
    const yoyPct = prevRate ? ((currentRate - prevRate) / Math.abs(prevRate)) * 100 : 0;
    
    // Generate rate timeseries
    const rateSeries = featuresAgg.map((featurePoint, i) => {
      const mauPoint = mauAgg[i];
      const rate = mauPoint?.value ? (featurePoint.value / mauPoint.value) * 100 : 0;
      return { date: featurePoint.date, value: Math.max(0, Math.min(100, rate)) };
    });
    
    return {
      meta: { source: "mock", metric: "features_rate", dims: [] },
      summary: { current: currentRate, prev: prevRate, yoyPct },
      timeseries: rateSeries,
      notes: ["Rate = antal features / MAU för perioden", "Källa: Mockdata (Features Rate)"]
    };
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


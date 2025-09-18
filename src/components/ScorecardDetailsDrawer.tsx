"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useFilters } from "@/components/GlobalFilters";
import type { Grain } from "@/lib/types";

export type TimePoint = { x: number; y: number };

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  metricId: string; // e.g. mau, pageviews, ndi, tasks, features, clarity, cwv_total
  title: string;
  sourceLabel: string;
  getSeries: (args: { start: string; end: string; grain: Grain; filters: any }) => Promise<TimePoint[]>;
  getCompareSeries?: (args: { start: string; end: string; grain: Grain; filters: any }) => Promise<TimePoint[]>;
  showChart?: boolean;
};

type Insight = {
  observations: string[];
  insights: string[];
  explanations: string[];
  recommendations: string[];
  note?: string;
};
type Anomaly = { date: string; value: number; delta: number; severity: "low" | "medium" | "high" };

// Simple anomaly detector: sliding mean/std and threshold 2.0 std + min delta
function detectAnomalies(series: TimePoint[]): Anomaly[] {
  if (!series || series.length < 8) return [];
  const windowSize = 7;
  const anomalies: Anomaly[] = [];
  for (let i = windowSize; i < series.length; i++) {
    const window = series.slice(i - windowSize, i).map((p) => p.y);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((a, b) => a + (b - mean) * (b - mean), 0) / window.length;
    const std = Math.sqrt(variance);
    const point = series[i];
    const delta = point.y - mean;
    if (std > 0 && Math.abs(delta) > Math.max(2 * std, 0.05 * Math.max(1, mean))) {
      const sev = Math.abs(delta) > 3 * std ? "high" : Math.abs(delta) > 2.5 * std ? "medium" : "low";
      anomalies.push({ date: new Date(point.x).toISOString().slice(0, 10), value: point.y, delta, severity: sev });
    }
  }
  return anomalies;
}

function generateInsights(metricId: string, series: TimePoint[], anomalies: Anomaly[], filters: any): Insight {
  // TODO: Replace with real OpenAI call using same input/output shape
  const nameMap: Record<string, string> = {
    mau: "Användare (MAU)",
    pageviews: "Sidvisningar",
    ndi: "Kundnöjdhet (NDI)",
    tasks: "Tasks",
    features: "Funktioner",
    clarity: "Clarity Score",
    cwv_total: "CWV total status",
  };
  const title = nameMap[metricId] || metricId;
  const values = series.map((p) => p.y);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const last = values.at(-1) ?? 0;
  const first = values[0] ?? 0;
  const changePct = first ? Math.round(((last - first) / Math.max(1, first)) * 100) : 0;
  const filtersNote = [filters?.device?.length ? `enhet: ${filters.device.join("/")}` : null, filters?.channel?.length ? `kanal: ${filters.channel.join("/")}` : null, filters?.audience?.length ? `roll: ${filters.audience.join("/")}` : null].filter(Boolean).join(", ");

  // Heuristics for bullets
  const observations: string[] = [
    `Genomsnitt: ${avg} ${title} under perioden.`,
    `${changePct >= 0 ? "+" : ""}${changePct} % tillväxt jämfört med föregående period.`,
  ];
  if (values.length > 6) {
    const lastWeekAvg = Math.round(values.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, values.slice(-7).length));
    observations.push(`Stabilisering på ny nivå runt ~${lastWeekAvg} i slutet av perioden.`);
  }

  const insights: string[] = [];
  // Trend break: compare first vs last third
  if (values.length > 9) {
    const third = Math.floor(values.length / 3);
    const startAvg = Math.round(values.slice(0, third).reduce((a, b) => a + b, 0) / third);
    const endAvg = Math.round(values.slice(-third).reduce((a, b) => a + b, 0) / third);
    if (endAvg > startAvg * 1.05) insights.push("Tydligt trendbrott mot högre nivå i slutet av perioden.");
  }
  const weekendAnoms = anomalies.filter((a) => {
    const d = new Date(a.date); const day = d.getDay(); return day === 6 || day === 0;
  });
  if (weekendAnoms.length) insights.push("Helgeffekt: Avvikelser inträffade på lördag–söndag.");
  if (changePct > 0) insights.push("Retention: Ökningen ser ut att ha kvarstått snarare än försvunnit.");

  const explanations: string[] = [
    "Kampanj eller marknadsaktivitet nära periodens slut.",
    "Lansering av ny produkt eller funktion.",
    "Extern exponering, t.ex. press eller sociala medier.",
  ];

  const recommendations: string[] = [
    "Segmentera analysen på kanal, enhet och ny/återkommande användare.",
    "Jämför helg vs. vardag för att avgöra om ökningen är tillfällig eller strukturell.",
    "Säkerställ tracking/etikettering för att utesluta tekniska fel.",
    "Planera A/B-test eller innehållsförändringar baserat på vad som drev ökningen.",
  ];

  const note = filtersNote ? `(Filter: ${filtersNote})` : undefined;

  return { observations, insights, explanations, recommendations, note };
}

export default function ScorecardDetailsDrawer({ open, onClose, metricId, title, sourceLabel, getSeries, getCompareSeries, showChart = true }: DrawerProps) {
  const { state } = useFilters();
  const [series, setSeries] = useState<TimePoint[]>([]);
  const [compare, setCompare] = useState<TimePoint[]>([]);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [show, setShow] = useState(false);

  const Chart = useMemo(() => dynamic(() => import("react-apexcharts"), { ssr: false }), []);

  useEffect(() => {
    if (!open) return;
    // start enter animation on next frame
    setShow(false);
    const id = requestAnimationFrame(() => setShow(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const args = { start: state.range.start, end: state.range.end, grain: state.range.grain, filters: { audience: state.audience, device: state.device, channel: state.channel } };
    getSeries(args).then((s) => {
      setSeries(s);
      const anomaliesDetected = detectAnomalies(s);
      setAnomalies(anomaliesDetected);
      setInsight(generateInsights(metricId, s, anomaliesDetected, args.filters));
    });
    if (getCompareSeries) getCompareSeries(args).then(setCompare).catch(() => setCompare([]));
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
      setShow(false);
    };
  }, [open, metricId, state]);

  function handleClose() {
    // play exit animation then call onClose
    setShow(false);
    setTimeout(() => onClose(), 220);
  }

  if (!open) return null;

  const options = {
    chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit" },
    stroke: { curve: "smooth", width: [4, 2], dashArray: [0, 8] },
    grid: { strokeDashArray: 5, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    xaxis: { type: "datetime", axisBorder: { show: false }, axisTicks: { show: false }, labels: { datetimeUTC: false } },
    colors: ["#E01E26", "#9CA3AF"],
    legend: { show: true, position: "top", horizontalAlign: "right" },
  } as const;

  const drawer = (
    <div className="fixed inset-0 z-[10050] flex justify-end">
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        className={`relative h-full w-full max-w-[680px] overflow-y-auto bg-white p-6 shadow-2xl transition-transform duration-200 ease-out dark:bg-gray-dark ${show ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Scorecard details"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-dark dark:text-white">{title}</h2>
            <div className="mt-1 text-xs text-dark-5">Källa: {sourceLabel} · Period {state.range.start} — {state.range.end}</div>
          </div>
          <button className="rounded border px-3 py-1 text-sm" onClick={handleClose} aria-label="Stäng">Stäng</button>
        </div>

        {showChart && (
          <div className="-mx-2 mb-6">
            <h3 className="mb-2 text-lg font-semibold">1. Diagram</h3>
            {series.length === 0 ? (
              <div className="h-48 bg-gray-100" />
            ) : (
              <Chart options={options as any} series={[{ name: "Nuvarande", data: series }, ...(compare.length ? [{ name: "Jämförelse", data: compare }] : [])]} type="line" height={260} />
            )}
          </div>
        )}

        <section className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">{showChart ? "2. AI-insikter" : "AI-insikter"}</h3>
          <div className="text-sm text-dark dark:text-white">
            <div className="mb-1 font-semibold text-dark dark:text-white">Iakttagelser</div>
            <ul className="ml-5 list-disc space-y-1">
              {(insight?.observations || []).map((t, i) => (<li key={i}>{t}</li>))}
            </ul>
            <div className="mt-3 mb-1 font-semibold text-dark dark:text-white">Insikter</div>
            <ul className="ml-5 list-disc space-y-1">
              {(insight?.insights || []).map((t, i) => (<li key={i}>{t}</li>))}
            </ul>
            <div className="mt-3 mb-1 font-semibold text-dark dark:text-white">Möjliga förklaringar</div>
            <ul className="ml-5 list-disc space-y-1">
              {(insight?.explanations || []).map((t, i) => (<li key={i}>{t}</li>))}
            </ul>
            <div className="mt-2 text-xs opacity-70">Källa: Mock – AI {insight?.note ? `· ${insight.note}` : ""}</div>
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">{showChart ? "3. Avvikelser" : "Avvikelser"}</h3>
          {anomalies.length === 0 ? (
            <div className="text-sm text-dark-6">Inga avvikelser.</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {anomalies.map((a, i) => (
                <li key={i} className="flex items-center justify-between rounded border px-2 py-1">
                  <span>{a.date}</span>
                  <span className="opacity-70">värde {Math.round(a.value)} ({a.delta > 0 ? "+" : ""}{Math.round(a.delta)})</span>
                  <span className={a.severity === "high" ? "text-red" : a.severity === "medium" ? "text-yellow-dark" : "text-dark-5"}>{a.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h3 className="mb-2 text-lg font-semibold">{showChart ? "4. Rekommendationer framåt" : "Rekommendationer framåt"}</h3>
          <ul className="ml-5 list-disc space-y-1 text-sm">
            {(insight?.recommendations || []).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>

        <div className="text-xs text-dark-5">Källa: {sourceLabel}</div>
      </aside>
    </div>
  );

  // Render at document.body to escape any local stacking context (header/sticky/transform)
  return typeof window !== "undefined" ? createPortal(drawer, document.body) : null;
}



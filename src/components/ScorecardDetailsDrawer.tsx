"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useFilters } from "@/components/GlobalFilters";
import type { Grain } from "@/lib/types";
import { UserIcon, GlobeIcon, MessageOutlineIcon, CheckIcon, XIcon, TrendingUpIcon } from "@/assets/icons";
import { Gauge } from "@/components/ui/gauge";
import { selectNdiPercent } from "@/lib/ndi-utils";

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
    tasks_rate: "Tasks",
    features_rate: "Funktioner",
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
  const [currentValue, setCurrentValue] = useState<number>(0);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

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
      
      // For gauge metrics, get current value from summary
      if (isGaugeMetric) {
        import("@/lib/resolver").then(({ getKpi }) => {
          getKpi({ metric: metricId as any, range: { start: args.start, end: args.end, grain: args.grain, comparisonMode: state.range.comparisonMode }, filters: args.filters }).then((res) => {
            setCurrentValue(res.summary.current);
          });
        });
      }
    });
    if (getCompareSeries) getCompareSeries(args).then(setCompare).catch(() => setCompare([]));
    // body lock to ensure only drawer scrolls
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus first focusable
    setTimeout(() => closeBtnRef.current?.focus(), 10);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
      setShow(false);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, metricId, state]);

  function handleClose() {
    // play exit animation then call onClose
    setShow(false);
    setTimeout(() => onClose(), 220);
  }

  if (!open) return null;

  const isRateMetric = metricId === "tasks_rate" || metricId === "features_rate" || metricId === "clarity" || metricId === "cwv_total";
  const isGaugeMetric = metricId === "ndi" || metricId === "tasks_rate" || metricId === "features_rate" || metricId === "cwv_total";
  
  const options = {
    chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit" },
    stroke: { curve: "smooth", width: [3, 2], dashArray: [0, 6] },
    grid: { borderColor: "#E5E7EB33", strokeDashArray: 4, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    xaxis: { type: "datetime", axisBorder: { show: false }, axisTicks: { show: false }, labels: { datetimeUTC: false, style: { colors: "#6B7280" } } },
    yaxis: { 
      labels: { 
        style: { colors: "#6B7280" },
        formatter: isRateMetric ? (value: number) => `${value.toFixed(1)}%` : undefined
      } 
    },
    colors: ["#E01E26", "#9CA3AF"],
    legend: { show: true, position: "top", horizontalAlign: "right" },
  } as const;

  // Local UI atoms
  const IconByMetric = () => {
    const base = "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red/10 text-red";
    switch (metricId) {
      case "mau":
      case "users":
        return <span className={base}><UserIcon /></span>;
      case "pageviews":
        return <span className={base}><GlobeIcon /></span>;
      case "ndi":
        return <span className={base}><MessageOutlineIcon /></span>;
      default:
        return <span className={base}><CheckIcon /></span>;
    }
  };

  const KpiChip = ({ label }: { label: string }) => (
    <span className="rounded-full border border-dark-3/30 px-2.5 py-1 text-xs text-dark-6 dark:border-white/15 dark:text-white/70">{label}</span>
  );

  const SectionCard = ({ title: sectionTitle, icon, accent = "text-red bg-red/10", children }: { title: string; icon?: React.ReactNode; accent?: string; children: React.ReactNode }) => (
    <section className="mb-4 rounded-2xl border border-dark-3/20 bg-white shadow-card dark:border-white/10 dark:bg-gray-dark">
      <div className="flex items-center gap-3 border-b border-dark-3/10 px-6 py-3 text-base font-semibold text-dark dark:border-white/10 dark:text-white">
        {icon ? (
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${accent}`}>
            <span className="scale-90">{icon}</span>
          </span>
        ) : null}
        <span className="leading-none">{sectionTitle}</span>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );

  const SeverityPill = ({ sev }: { sev: Anomaly["severity"] }) => (
    <span
      className={
        sev === "high"
          ? "rounded-full bg-red/10 px-2 py-0.5 text-xs font-medium text-red"
          : sev === "medium"
          ? "rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-medium text-yellow-dark"
          : "rounded-full bg-dark-3/10 px-2 py-0.5 text-xs font-medium text-dark-6"
      }
    >
      {sev}
    </span>
  );

  // focus trap within drawer
  const onKeyDownTrap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = drawerRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      (last as HTMLElement).focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      (first as HTMLElement).focus();
    }
  };

  const drawer = (
    <div className="fixed inset-0 z-[10050] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-describedby="drawer-desc">
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        className={`relative h-full w-full max-w-[720px] overflow-y-auto bg-white shadow-2xl transition-transform duration-200 ease-out dark:bg-gray-dark ${show ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Scorecard details"
        ref={drawerRef as any}
        onKeyDown={onKeyDownTrap}
      >
        <header className="sticky top-0 z-10 border-b border-dark-3/10 bg-white/95 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-gray-dark/95">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconByMetric />
              <div>
                <h2 id="drawer-title" className="text-xl font-semibold text-dark dark:text-white">{title}</h2>
                <div id="drawer-desc" className="mt-0.5 flex items-center gap-2 text-xs text-dark-5">
                  <span>Källa: {sourceLabel}</span>
                  <span>•</span>
                  <KpiChip label={`Period ${state.range.start} — ${state.range.end}`} />
                </div>
              </div>
            </div>
            <button ref={closeBtnRef as any} className="rounded-full border border-dark-3/30 p-2 text-dark-6 hover:bg-dark-2/10 focus:outline-none focus:ring-2 focus:ring-red dark:border-white/15 dark:text-white/80" onClick={handleClose} aria-label="Stäng">
              <XIcon />
            </button>
          </div>
        </header>

        <div className="px-6 pt-4 pb-28">{/* padding for sticky footer */}
          {showChart && (
            <SectionCard title="1. Diagram" icon={<TrendingUpIcon /> } accent="text-red bg-red/10">
              {series.length === 0 ? (
                <div className="h-52 animate-pulse rounded-xl bg-dark-2/10 dark:bg-white/10" />
              ) : (
                <div>
                  {/* Show gauge for NDI and rate metrics */}
                  {isGaugeMetric && (
                    <div className="mb-6 flex justify-center">
                      <Gauge 
                        valuePct={metricId === "ndi" ? selectNdiPercent(currentValue) : Math.min(100, Math.max(0, currentValue))} 
                        size={160}
                        strokeWidth={12}
                        label={metricId === "ndi" ? "NDI" : metricId === "tasks_rate" ? "Tasks" : metricId === "features_rate" ? "Funktioner" : "CWV"}
                      />
                    </div>
                  )}
                  <Chart options={options as any} series={[{ name: "Nuvarande", data: series }, ...(compare.length ? [{ name: "Jämförelse", data: compare }] : [])]} type="line" height={240} />
                </div>
              )}
            </SectionCard>
          )}

          <SectionCard title={showChart ? "2. AI-insikter" : "AI-insikter"} icon={<MessageOutlineIcon /> } accent="text-blue-600 bg-blue-600/10">
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
          </SectionCard>

          <SectionCard title={showChart ? "3. Avvikelser" : "Avvikelser"} icon={<XIcon /> } accent="text-yellow-dark bg-yellow-400/10">
            {anomalies.length === 0 ? (
              <div className="text-sm text-dark-6">Inga avvikelser.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {anomalies.map((a, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl border border-dark-3/20 bg-white px-3 py-2 dark:border-white/10 dark:bg-transparent">
                    <span className="font-medium text-dark dark:text-white">{a.date}</span>
                    <span className="text-dark-6">värde {Math.round(a.value)} ({a.delta > 0 ? "+" : ""}{Math.round(a.delta)})</span>
                    <SeverityPill sev={a.severity} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title={showChart ? "4. Rekommendationer" : "Rekommendationer"} icon={<CheckIcon /> } accent="text-green-600 bg-green-600/10">
            {insight?.recommendations?.length ? (
              <ul className="space-y-2 text-sm">
                {insight.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-600"><CheckIcon /></span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-16 animate-pulse rounded-xl bg-dark-2/10 dark:bg-white/10" />
            )}
          </SectionCard>

          <div className="mt-4 text-xs text-dark-5">Källa: {sourceLabel}</div>
        </div>

        <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-dark-3/10 bg-white/95 px-6 py-3 backdrop-blur dark:border-white/10 dark:bg-gray-dark/95">
          <div className="flex gap-2">
            <button className="cursor-not-allowed rounded-lg bg-dark-2/10 px-3 py-2 text-sm text-dark-6 dark:bg-white/10 dark:text-white/50" disabled>
              Exportera
            </button>
            <button className="cursor-not-allowed rounded-lg bg-dark-2/10 px-3 py-2 text-sm text-dark-6 dark:bg-white/10 dark:text-white/50" disabled>
              Kopiera
            </button>
          </div>
          <button className="rounded-lg bg-red px-4 py-2 text-sm font-medium text-white hover:bg-red/90" onClick={handleClose}>Stäng</button>
        </footer>
      </aside>
    </div>
  );

  // Render at document.body to escape any local stacking context (header/sticky/transform)
  return typeof window !== "undefined" ? createPortal(drawer, document.body) : null;
}



"use client";
import { useEffect, useMemo, useState } from "react";
// Do not import resolver on client; we call server API instead to avoid bundling GA4 SDK
import { Params, KpiResponse } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import { formatNumber, formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { UserIcon, GlobeIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";

// TODO replace with UI settings
const KPI_PROGRESS_ENABLED_METRICS = ['mau', 'pageviews', 'clarity_score'];
const KPI_ANNUAL_GOALS = {
  mau: 100000, // Monthly Active Users
  pageviews: 1500000, // Page views
  clarity_score: 80, // Clarity Score (out of 100)
};

type Props = {
  title: string;
  metric: Params["metric"];
  range: Params["range"];
};

// Icon mapping for different metrics
const getMetricIcon = (metric: string) => {
  switch (metric) {
    case "mau":
    case "users":
      return UserIcon;
    case "pageviews":
    case "sessions":
      return GlobeIcon;
    case "ndi":
      return UserIcon; // NDI uses UserIcon like MAU
    default:
      return UserIcon;
  }
};

// Variant mapping based on metric type
const getMetricVariant = (metric: string) => {
  switch (metric) {
    case "mau":
    case "users":
      return "primary" as const;
    case "pageviews":
    case "sessions":
      return "success" as const;
    case "ndi":
      return "primary" as const; // NDI uses primary variant like MAU
    default:
      return "default" as const;
  }
};

export default function TotalDiffCard({ title, metric, range }: Props) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const { state } = useFilters();
  const [open, setOpen] = useState(false);
  
  const fetchKpi = async (args: { metric: Props["metric"]; start: string; end: string; grain: any; comparisonMode?: any; filters?: any }): Promise<KpiResponse> => {
    const qs = new URLSearchParams({
      metric: String(args.metric),
      start: args.start,
      end: args.end,
      grain: args.grain || "day",
      comparisonMode: args.comparisonMode || "none",
    }).toString();
    const resp = await fetch(`/api/kpi?${qs}`);
    if (!resp.ok) throw new Error(`KPI API error ${resp.status}`);
    return resp.json();
  };
  
  // Helpers to derive target NDI quarter end-date string
  const getQuarterFromDate = (dateStr: string) => Math.floor(new Date(dateStr).getMonth() / 3) + 1;
  const getQuarterEndDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const q = getQuarterFromDate(dateStr);
    const month = q * 3; // 3,6,9,12
    const day = [31, 30, 30, 31][q - 1];
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  
  // Get comparison label based on current comparison mode
  const getComparisonLabel = () => {
    // NDI always shows quarter comparison regardless of global comparison mode
    if (metric === 'ndi') {
      return 'vs. föregående kvartal';
    }
    
    switch (state.range.comparisonMode) {
      case 'yoy': return 'vs. föregående år';
      case 'prev': return 'vs. föregående period';
      case 'none': return null; // No comparison label when none is selected
      default: return 'vs. föregående period';
    }
  };
  
  useEffect(() => {
    fetchKpi({ metric, start: range.start, end: range.end, grain: range.grain, comparisonMode: state.range.comparisonMode, filters: { audience: state.audience, device: state.device, channel: state.channel } })
      .then(setData)
      .catch(() => setData(null));
  }, [metric, range.start, range.end, range.compareYoy, range.grain, state.audience.join(","), state.device.join(","), state.channel.join(",")]);

  const summary = data?.summary;
  const Icon = getMetricIcon(metric);
  const variant = getMetricVariant(metric);
  
  // Check if this metric should show progress bar
  const showProgress = KPI_PROGRESS_ENABLED_METRICS.includes(metric);
  const progressGoal = KPI_ANNUAL_GOALS[metric as keyof typeof KPI_ANNUAL_GOALS];
  
  // Determine unit based on metric
  const getProgressUnit = () => {
    switch (metric) {
      case 'mau':
        return '';
      case 'pageviews':
        return '';
      default:
        return '';
    }
  };
  const getSeries = useMemo(() => async ({ start, end, grain, filters }: any) => {
    const res = await fetchKpi({ metric, start, end, grain, comparisonMode: state.range.comparisonMode, filters });
    return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
  }, [metric, state.range.comparisonMode]);

  const getCompareSeries = useMemo(() => async ({ start, end, grain, filters }: any) => {
    const res = await fetchKpi({ metric, start, end, grain, comparisonMode: state.range.comparisonMode, filters });
    const points = res.compareTimeseries || [];
    const cur = (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    return points.map((p, i) => ({ x: cur[i]?.x ?? new Date(p.date).getTime(), y: p.value }));
  }, [metric, state.range.comparisonMode]);

  return (
    <div className="relative">
      <ScoreCard
        label={title}
        value={(summary && data)
          ? (metric === "ndi"
              ? (() => {
                  const targetDate = getQuarterEndDate(range.end);
                  const hasTarget = (data.timeseries || []).some(p => p.date === targetDate);
                  if (!hasTarget) return "N/A";
                  return summary.current.toFixed(1);
                })()
              : formatNumber(summary.current)
            )
          : "–"}
        growthRate={summary ? summary.yoyPct : undefined}
        Icon={Icon}
        variant={variant}
        source={data?.notes?.find?.(n => n.startsWith("Källa:"))?.replace("Källa:", "").trim() || "Mock"}
        className="min-h-[208px]"
        showProgress={showProgress}
        progressGoal={progressGoal}
        progressUnit={getProgressUnit()}
        comparisonLabel={getComparisonLabel()}
        onClick={() => setOpen(true)}
      />
      <div className="absolute top-2 right-2">
        <InfoTooltip text={metric === "ndi" ? "NDI kvartalsvärden. Mockdata och definitioner för demo." : `Metrik: ${metric}. Mockdata och definitioner för demo.`} />
      </div>
      <ScorecardDetailsDrawer
        open={open}
        onClose={() => setOpen(false)}
        metricId={metric}
        title={title}
        sourceLabel={metric === "ndi" ? "Uppladdad data" : "Mock"}
        getSeries={getSeries}
        getCompareSeries={getCompareSeries}
      />
    </div>
  );
}



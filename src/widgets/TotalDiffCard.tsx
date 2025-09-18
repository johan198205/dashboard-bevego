"use client";
import { useEffect, useMemo, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { Params, KpiResponse } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import { formatNumber, formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { UserIcon, GlobeIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";

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
    default:
      return "default" as const;
  }
};

export default function TotalDiffCard({ title, metric, range }: Props) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const { state } = useFilters();
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    getKpi({ metric, range, filters: { audience: state.audience, device: state.device, channel: state.channel } }).then(setData);
  }, [metric, range.start, range.end, range.compareYoy, range.grain, state.audience.join(","), state.device.join(","), state.channel.join(",")]);

  const summary = data?.summary;
  const Icon = getMetricIcon(metric);
  const variant = getMetricVariant(metric);
  const getSeries = useMemo(() => async ({ start, end, grain, filters }: any) => {
    const res = await getKpi({ metric, range: { start, end, grain, comparisonMode: state.range.comparisonMode }, filters });
    return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
  }, [metric, state.range.comparisonMode]);

  const getCompareSeries = useMemo(() => async ({ start, end, grain, filters }: any) => {
    const res = await getKpi({ metric, range: { start, end, grain, comparisonMode: state.range.comparisonMode }, filters });
    const points = res.compareTimeseries || [];
    const cur = (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    return points.map((p, i) => ({ x: cur[i]?.x ?? new Date(p.date).getTime(), y: p.value }));
  }, [metric, state.range.comparisonMode]);

  return (
    <div className="relative">
      <ScoreCard
        label={title}
        value={summary ? formatNumber(summary.current) : "–"}
        growthRate={summary ? summary.yoyPct : undefined}
        Icon={Icon}
        variant={variant}
        source="Mock"
        onClick={() => setOpen(true)}
      />
      <div className="absolute top-2 right-2">
        <InfoTooltip text={`Metrik: ${metric}. Mockdata och definitioner för demo.`} />
      </div>
      <ScorecardDetailsDrawer
        open={open}
        onClose={() => setOpen(false)}
        metricId={metric}
        title={title}
        sourceLabel="Mock"
        getSeries={getSeries}
        getCompareSeries={getCompareSeries}
      />
    </div>
  );
}



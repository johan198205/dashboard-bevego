"use client";
import { useEffect, useMemo, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { Params, KpiResponse } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import { Gauge } from "@/components/ui/gauge";
import { UserIcon, GlobeIcon, CheckIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";

type Props = {
  title: string;
  metric: Params["metric"];
  range: Params["range"];
  baseValue?: number; // Base value for percentage calculation
};

// Icon mapping for different metrics
const getMetricIcon = (metric: string) => {
  switch (metric) {
    case "tasks_rate":
      return UserIcon;
    case "features_rate":
      return GlobeIcon;
    case "cwv_total":
      return CheckIcon;
    default:
      return UserIcon;
  }
};

export default function GaugeCard({ title, metric, range, baseValue = 100 }: Props) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const { state } = useFilters();
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    getKpi({ metric, range, filters: { audience: state.audience, device: state.device, channel: state.channel } }).then(setData);
  }, [metric, range.start, range.end, range.compareYoy, range.grain, state.audience.join(","), state.device.join(","), state.channel.join(",")]);

  const summary = data?.summary;
  const Icon = getMetricIcon(metric);
  
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

  // Calculate percentage value
  const percentageValue = summary ? Math.min(100, Math.max(0, summary.current)) : 0;
  const displayValue = percentageValue.toFixed(2);

  return (
    <div className="relative">
      <div 
        className="relative overflow-hidden rounded-xl border border-stroke bg-white px-7.5 py-6 shadow-1 dark:border-strokedark dark:bg-boxdark cursor-pointer hover:shadow-2 transition-shadow duration-200"
        onClick={() => setOpen(true)}
      >
        {/* Header - match other scorecards with icon on right */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-title-md font-bold text-black dark:text-white">
              {title}
            </h4>
            <p className="text-sm font-medium text-body-color">Mock</p>
          </div>
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-lg bg-red/10">
            <Icon className="text-red" />
          </div>
        </div>
        
        {/* Info icon in top-right corner like other scorecards */}
        <div className="absolute top-4 right-4">
          <InfoTooltip text={`Metrik: ${metric}. Mockdata och definitioner för demo.`} />
        </div>
        
        {/* Gauge */}
        <div className="mt-6 flex justify-center">
          <Gauge 
            valuePct={percentageValue} 
            size={140}
            strokeWidth={10}
            label={title}
          />
        </div>
        
        {/* Growth indicator - match other scorecards */}
        {summary && summary.yoyPct !== undefined && (
          <div className="mt-4 flex justify-center">
            <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              summary.yoyPct >= 0 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              <span>{summary.yoyPct >= 0 ? '↗' : '↘'}</span>
              <span>{Math.abs(summary.yoyPct).toFixed(1)}% vs. previous period</span>
            </div>
          </div>
        )}
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

"use client";
import { useEffect, useMemo, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import { Gauge } from "@/components/ui/gauge";
import { UserIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import { selectNdiPercent, ndiTimeseriesToChart } from "@/lib/ndi-utils";
import { getNdiDataSourceLabel } from "@/services/ndi-data.service";

export default function NdiCard({ range, compact = false }: { range: Params["range"]; compact?: boolean }) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string>('Mockdata');
  
  useEffect(() => { 
    getKpi({ metric: "ndi", range }).then(setData); 
    getNdiDataSourceLabel().then(setSourceLabel);
  }, [range.start, range.end, range.comparisonMode, range.grain]);
  
  const s = data?.summary;
  
  const getSeries = useMemo(() => async ({ start, end, grain, filters }: any) => {
    // Use resolver data for consistency - same as card data
    const res = await getKpi({ metric: "ndi", range: { start, end, grain, comparisonMode: range.comparisonMode }, filters });
    return ndiTimeseriesToChart(res.timeseries || []);
  }, [range.comparisonMode]);
  
  // Use normalized NDI percentage from summary (same as drawer)
  const ndiValue = s ? s.current : 0;
  const ndiPct = selectNdiPercent(ndiValue);
  
  return (
    <div className="relative">
      <div 
        className={`relative overflow-hidden rounded-xl border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark cursor-pointer hover:shadow-2 transition-shadow duration-200 ${
          compact ? 'px-4 py-4' : 'px-7.5 py-6'
        }`}
        onClick={() => setOpen(true)}
      >
        {/* Header - match other scorecards with icon on right and info in corner */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`font-bold text-black dark:text-white ${
              compact ? 'text-sm' : 'text-title-md'
            }`}>
              Kundnöjdhet (NDI)
            </h4>
            <p className={`font-medium text-body-color ${
              compact ? 'text-xs' : 'text-sm'
            }`}>{sourceLabel}</p>
          </div>
          <div className={`flex items-center justify-center rounded-lg bg-red/10 ${
            compact ? 'h-8 w-8' : 'h-11.5 w-11.5'
          }`}>
            <UserIcon className={`text-red ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </div>
        </div>
        
        {/* Info icon in top-right corner like other scorecards */}
        <div className={`absolute ${compact ? 'top-2 right-2' : 'top-4 right-4'}`}>
          <InfoTooltip text={`NDI kvartalsvärden. ${sourceLabel}.`} />
        </div>
        
        {/* Gauge */}
        <div className={`flex justify-center ${compact ? 'mt-3' : 'mt-6'}`}>
          <Gauge 
            valuePct={ndiPct} 
            size={compact ? 100 : 140}
            strokeWidth={compact ? 8 : 10}
          />
        </div>
        
        {/* Growth indicator - match other scorecards */}
        {s && s.yoyPct !== undefined && (
          <div className={`flex justify-center ${compact ? 'mt-2' : 'mt-4'}`}>
            <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              s.yoyPct >= 0 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              <span>{s.yoyPct >= 0 ? '↗' : '↘'}</span>
              <span>{Math.abs(s.yoyPct).toFixed(1)}% vs. previous period</span>
            </div>
          </div>
        )}
      </div>
      
      <ScorecardDetailsDrawer
        open={open}
        onClose={() => setOpen(false)}
        metricId="ndi"
        title="Kundnöjdhet (NDI)"
        sourceLabel={sourceLabel}
        getSeries={getSeries}
        getCompareSeries={async () => []}
      />
    </div>
  );
}



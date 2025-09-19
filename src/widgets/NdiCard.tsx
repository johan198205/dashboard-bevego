"use client";
import { useEffect, useMemo, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import { Gauge } from "@/components/ui/gauge";
import { UserIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import { selectNdiPercent, ndiTimeseriesToChart } from "@/lib/ndi-utils";

export default function NdiCard({ range }: { range: Params["range"] }) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const [open, setOpen] = useState(false);
  
  useEffect(() => { 
    getKpi({ metric: "ndi", range }).then(setData); 
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
        className="relative overflow-hidden rounded-xl border border-stroke bg-white px-7.5 py-6 shadow-1 dark:border-strokedark dark:bg-boxdark cursor-pointer hover:shadow-2 transition-shadow duration-200"
        onClick={() => setOpen(true)}
      >
        {/* Header - match other scorecards with icon on right and info in corner */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-title-md font-bold text-black dark:text-white">
              Kundnöjdhet (NDI)
            </h4>
            <p className="text-sm font-medium text-body-color">Mock</p>
          </div>
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-lg bg-red/10">
            <UserIcon className="text-red" />
          </div>
        </div>
        
        {/* Info icon in top-right corner like other scorecards */}
        <div className="absolute top-4 right-4">
          <InfoTooltip text="NDI kvartalsvärden. Mockdata." />
        </div>
        
        {/* Gauge */}
        <div className="mt-6 flex justify-center">
          <Gauge 
            valuePct={ndiPct} 
            size={140}
            strokeWidth={10}
            label="NDI"
          />
        </div>
        
        {/* Growth indicator - match other scorecards */}
        {s && s.yoyPct !== undefined && (
          <div className="mt-4 flex justify-center">
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
        sourceLabel="Mock"
        getSeries={getSeries}
        getCompareSeries={async () => []}
      />
    </div>
  );
}



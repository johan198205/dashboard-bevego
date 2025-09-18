"use client";
import { useEffect, useMemo, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { UserIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";

export default function NdiCard({ range }: { range: Params["range"] }) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { getKpi({ metric: "ndi", range }).then(setData); }, [range.start, range.end, range.compareYoy, range.grain]);
  const s = data?.summary;
  const getSeries = useMemo(() => async ({ start, end, grain }: any) => {
    // Mock NDI daily series
    const sTs = new Date(start).getTime();
    const eTs = new Date(end).getTime();
    const step = grain === "month" ? 1000 * 60 * 60 * 24 * 30 : grain === "week" ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24;
    const data: { x: number; y: number }[] = [];
    for (let t = sTs; t <= eTs; t += step) data.push({ x: t, y: 400 + Math.round(Math.random() * 200) });
    return data;
  }, []);
  
  return (
    <div className="relative">
      <ScoreCard
        label="Kundnöjdhet (NDI)"
        value={s ? formatNumber(s.current) : "–"}
        growthRate={s ? s.yoyPct : undefined}
        Icon={UserIcon}
        variant="info"
        source="Mock"
        onClick={() => setOpen(true)}
      />
      <div className="absolute top-2 right-2">
        <InfoTooltip text="NDI kvartalsvärden. Mockdata." />
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



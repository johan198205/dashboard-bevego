"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { UserIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";

export default function NdiCard({ range }: { range: Params["range"] }) {
  const [data, setData] = useState<KpiResponse | null>(null);
  useEffect(() => { getKpi({ metric: "ndi", range }).then(setData); }, [range.start, range.end, range.compareYoy, range.grain]);
  const s = data?.summary;
  
  return (
    <div className="relative">
      <ScoreCard
        label="Kundnöjdhet (NDI)"
        value={s ? formatNumber(s.current) : "–"}
        growthRate={s ? s.yoyPct : undefined}
        Icon={UserIcon}
        variant="info"
        source="Mock"
      />
      <div className="absolute top-2 right-2">
        <InfoTooltip text="NDI kvartalsvärden. Mockdata." />
      </div>
    </div>
  );
}



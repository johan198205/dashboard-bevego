"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/format";
import InfoTooltip from "@/components/InfoTooltip";

export default function NdiCard({ range }: { range: Params["range"] }) {
  const [data, setData] = useState<KpiResponse | null>(null);
  useEffect(() => { getKpi({ metric: "ndi", range }).then(setData); }, [range.start, range.end, range.compareYoy, range.grain]);
  const s = data?.summary;
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="title">Kundnöjdhet (NDI)</div>
        <div className="flex items-center gap-2">
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text="NDI kvartalsvärden. Mockdata." />
        </div>
      </div>
      <div className="value">{s ? formatNumber(s.current) : "–"}</div>
      {s && <div className={`text-sm ${s.yoyPct >= 0 ? "text-green-600" : "text-red-600"}`}>{formatPercent(s.yoyPct)} YoY</div>}
    </div>
  );
}



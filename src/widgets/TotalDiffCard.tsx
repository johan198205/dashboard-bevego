"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { Params, KpiResponse } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/format";
import InfoTooltip from "@/components/InfoTooltip";

type Props = {
  title: string;
  metric: Params["metric"];
  range: Params["range"];
};

export default function TotalDiffCard({ title, metric, range }: Props) {
  const [data, setData] = useState<KpiResponse | null>(null);
  useEffect(() => {
    getKpi({ metric, range }).then(setData);
  }, [metric, range.start, range.end, range.compareYoy, range.grain]);

  const summary = data?.summary;

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="title">{title}</div>
        <div className="flex items-center gap-2">
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text={`Metrik: ${metric}. Mockdata och definitioner för demo.`} />
        </div>
      </div>
      <div className="value">{summary ? formatNumber(summary.current) : "–"}</div>
      {summary && (
        <div className={`text-sm ${summary.yoyPct >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatPercent(summary.yoyPct)} vs föregående år
        </div>
      )}
    </div>
  );
}



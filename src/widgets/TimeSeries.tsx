"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import InfoTooltip from "@/components/InfoTooltip";

type Props = { title: string; metric: Params["metric"]; range: Params["range"] };

export default function TimeSeries({ title, metric, range }: Props) {
  const [data, setData] = useState<KpiResponse | null>(null);
  useEffect(() => { getKpi({ metric, range }).then(setData); }, [metric, range.start, range.end, range.compareYoy, range.grain]);

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="title">{title}</div>
        <div className="flex items-center gap-2">
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text={`Tidsserie för ${metric}. Mockdata.`} />
        </div>
      </div>
      <div className="h-32 w-full bg-gray-100" aria-label="diagram placeholder" />
      <div className="mt-2 text-xs text-gray-500">{data?.timeseries.length || 0} punkter</div>
    </div>
  );
}



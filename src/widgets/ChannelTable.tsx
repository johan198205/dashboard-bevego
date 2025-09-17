"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import InfoTooltip from "@/components/InfoTooltip";

export default function ChannelTable({ metric, range }: { metric: Params["metric"]; range: Params["range"] }) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const { state } = useFilters();
  useEffect(() => {
    getKpi({ metric, range, filters: { audience: state.audience, device: state.device, channel: state.channel } }).then(setData);
  }, [metric, range.start, range.end, range.compareYoy, range.grain, state.audience.join(","), state.device.join(","), state.channel.join(",")]);
  const rows = data?.breakdown || [];

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="title">Kanalgrupper</div>
        <div className="flex items-center gap-2">
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text="Brytning per kanalgrupp. Mockdata." />
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">Inga rader för valt filter.</div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500"><th>Kanal</th><th className="text-right">Antal</th><th className="text-right">{range.comparisonMode === 'prev' ? 'Föreg. period' : 'YoY'}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="py-2">{r.key}</td>
                  <td className="py-2 text-right">{new Intl.NumberFormat("sv-SE").format(r.value)}</td>
                  <td className="py-2 text-right">{r.yoyPct !== undefined ? `${r.yoyPct.toFixed(2)}%` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



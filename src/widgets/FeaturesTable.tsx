"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import InfoTooltip from "@/components/InfoTooltip";

export default function FeaturesTable({ range }: { range: Params["range"] }) {
  const [features, setFeatures] = useState<KpiResponse | null>(null);
  useEffect(() => { getKpi({ metric: "features", range }).then(setFeatures); }, [range.start, range.end, range.compareYoy, range.grain]);
  const rows = features?.breakdown || [];
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="title">Funktioner</div>
        <div className="flex items-center gap-2">
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text="Användning per funktion. Mockdata." />
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">Inga rader för valt filter.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500"><th>Funktion</th><th className="text-right">Antal</th><th className="text-right">YoY</th></tr>
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
      )}
    </div>
  );
}



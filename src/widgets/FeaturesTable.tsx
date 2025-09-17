"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import InfoTooltip from "@/components/InfoTooltip";
import { formatPercent } from "@/lib/format";

export default function FeaturesTable({ range }: { range: Params["range"] }) {
  const [features, setFeatures] = useState<KpiResponse | null>(null);
  const [mau, setMau] = useState<KpiResponse | null>(null);
  const [users, setUsers] = useState<KpiResponse | null>(null);
  useEffect(() => {
    getKpi({ metric: "features", range }).then(setFeatures);
    getKpi({ metric: "mau", range }).then(setMau);
    getKpi({ metric: "users", range }).then(setUsers);
  }, [range.start, range.end, range.compareYoy, range.grain]);
  const rows = features?.breakdown || [];
  const denominatorCurrent = users?.summary.current || mau?.summary.current || 0;
  const denominatorPrev = users?.summary.prev || mau?.summary.prev || 0;
  const formatPercentUnsigned = (v: number) => formatPercent(v).replace(/^\+/, "");
  const totalRate = (() => {
    const totalCount = rows.reduce((acc, r) => acc + (r.value || 0), 0);
    if (!denominatorCurrent || totalCount <= 0) return null;
    return (totalCount / denominatorCurrent) * 100;
  })();

  const yoyRatePct = (() => {
    if (!features?.summary) return null;
    const prevCount = features.summary.prev || 0;
    if (!prevCount || !denominatorPrev || totalRate === null) return null;
    const prevRate = (prevCount / denominatorPrev) * 100;
    if (!Number.isFinite(prevRate) || prevRate === 0) return null;
    return ((totalRate - prevRate) / Math.abs(prevRate)) * 100;
  })();
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="title">Funktioner</div>
        <div className="flex items-center gap-2">
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text="Användning per funktion. Mockdata." />
        </div>
      </div>
      <div className="value">{totalRate !== null ? formatPercentUnsigned(totalRate) : "–"}</div>
      {yoyRatePct !== null && (
        <div className={`text-sm ${yoyRatePct >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatPercentUnsigned(yoyRatePct)} {range.comparisonMode === 'prev' ? 'vs föregående period' : ''}
        </div>
      )}
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">Inga rader för valt filter.</div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500"><th>Funktion</th><th className="text-right">Antal</th><th className="text-right">{range.comparisonMode === 'prev' ? 'Föreg. period' : 'YoY'}</th></tr>
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



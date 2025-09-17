"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import InfoTooltip from "@/components/InfoTooltip";
import { formatPercent } from "@/lib/format";

export default function TasksTable({ range }: { range: Params["range"] }) {
  const [tasks, setTasks] = useState<KpiResponse | null>(null);
  const [mau, setMau] = useState<KpiResponse | null>(null);
  const [users, setUsers] = useState<KpiResponse | null>(null);
  useEffect(() => {
    getKpi({ metric: "tasks", range }).then(setTasks);
    getKpi({ metric: "mau", range }).then(setMau);
    getKpi({ metric: "users", range }).then(setUsers);
  }, [range.start, range.end, range.compareYoy, range.grain]);

  const denominatorCurrent = users?.summary.current || mau?.summary.current || 0;
  const denominatorPrev = users?.summary.prev || mau?.summary.prev || 0;

  const formatPercentUnsigned = (v: number) => formatPercent(v).replace(/^\+/, "");

  const rows = (tasks?.breakdown || []).map((r) => {
    const rate = denominatorCurrent ? (r.value / denominatorCurrent) * 100 : 0;
    return { key: r.key, value: r.value, rate, yoyPct: r.yoyPct };
  });
  const totalRate = (() => {
    const totalCount = rows.reduce((acc, r) => acc + (r.value || 0), 0);
    if (!denominatorCurrent || totalCount <= 0) return null;
    return (totalCount / denominatorCurrent) * 100;
  })();

  const yoyRatePct = (() => {
    if (!tasks?.summary) return null;
    const prevCount = tasks.summary.prev || 0;
    if (!prevCount || !denominatorPrev || totalRate === null) return null;
    const prevRate = (prevCount / denominatorPrev) * 100;
    if (!Number.isFinite(prevRate) || prevRate === 0) return null;
    return ((totalRate - prevRate) / Math.abs(prevRate)) * 100;
  })();

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="title">Tasks</div>
        <div className="flex items-center gap-2">
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text="Rate = antal / MAU för perioden. Mockdata." />
        </div>
      </div>
      <div className="value">{totalRate !== null ? formatPercentUnsigned(totalRate) : "–"}</div>
      {yoyRatePct !== null && (
        <div className={`text-sm ${yoyRatePct >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatPercentUnsigned(yoyRatePct)}
        </div>
      )}
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">Inga rader för valt filter.</div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500"><th>Task</th><th className="text-right">Antal</th><th className="text-right">Rate</th><th className="text-right">YoY</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="py-2">{r.key}</td>
                  <td className="py-2 text-right">{new Intl.NumberFormat("sv-SE").format(r.value)}</td>
                  <td className="py-2 text-right">{r.rate.toFixed(2)}%</td>
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



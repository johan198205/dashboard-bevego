"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import InfoTooltip from "@/components/InfoTooltip";

export default function TasksTable({ range }: { range: Params["range"] }) {
  const [tasks, setTasks] = useState<KpiResponse | null>(null);
  const [mau, setMau] = useState<KpiResponse | null>(null);
  useEffect(() => {
    getKpi({ metric: "tasks", range }).then(setTasks);
    getKpi({ metric: "mau", range }).then(setMau);
  }, [range.start, range.end, range.compareYoy, range.grain]);

  const rows = (tasks?.breakdown || []).map((r) => {
    const rate = mau?.summary.current ? (r.value / mau.summary.current) * 100 : 0;
    return { key: r.key, value: r.value, rate, yoyPct: r.yoyPct };
  });

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <div className="title">Tasks</div>
        <div className="flex items-center gap-2">
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text="Rate = antal / MAU för perioden. Mockdata." />
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">Inga rader för valt filter.</div>
      ) : (
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
      )}
    </div>
  );
}



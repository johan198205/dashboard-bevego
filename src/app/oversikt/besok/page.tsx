"use client";

import { useState } from "react";
import { useFilters } from "@/components/GlobalFilters";
import { ScoreCard } from "@/components/ui/scorecard";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import * as overviewIcons from "@/app/(home)/_components/overview-cards/icons";
import { useKpi } from "@/hooks/useKpi";
import { cn } from "@/lib/utils";

export default function Page() {
  const { state } = useFilters();
  const range = state.range as any;
  const [drawer, setDrawer] = useState<{ metricId: string; title: string } | null>(null);

  // Helper to fetch series for sparkline and drawer
  const getSeries = (metricId: string) => async ({ start, end, grain, filters }: any) => {
    const params = new URLSearchParams({
      metric: metricId,
      start,
      end,
      grain: grain || 'day',
      comparisonMode: range.comparisonMode || 'yoy'
    });
    
    const res = await fetch(`${window.location.origin}/api/kpi?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.timeseries.map((p: any) => ({ x: new Date(p.date).getTime(), y: p.value }));
  };


  // Get comparison label based on current comparison mode
  const getComparisonLabel = () => {
    switch (state.range.comparisonMode) {
      case 'yoy': return 'vs. previous year';
      case 'prev': return 'vs. previous period';
      default: return 'vs. previous period';
    }
  };

  // NOTE: Using useKpi for caching and loading states

  const cards = [
    { id: "sessions", title: "Sessions", Icon: overviewIcons.Views, format: (v: number) => v.toLocaleString("sv-SE") },
    { id: "engagedSessions", title: "Engaged Sessions", Icon: overviewIcons.Profit, format: (v: number) => v.toLocaleString("sv-SE") },
    { id: "engagementRate", title: "Engagement rate", Icon: overviewIcons.ClarityScore, format: (v: number) => `${v.toFixed(1)}%` },
    { id: "avgEngagementTime", title: "Avg engagement time / session", Icon: overviewIcons.CwvTotalStatus, format: (v: number) => {
      // GA4 averageSessionDuration returns seconds, format as minutes and seconds
      const totalSeconds = Math.round(v);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}m ${seconds}s`;
    }},
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((c, idx) => (
        <KpiCard
          key={idx}
          title={c.title}
          metricId={c.id}
          Icon={c.Icon}
          open={() => setDrawer({ metricId: c.id, title: c.title })}
          format={c.format}
          comparisonLabel={getComparisonLabel()}
        />
      ))}

      {drawer && (
        <ScorecardDetailsDrawer
          open={!!drawer}
          onClose={() => setDrawer(null)}
          metricId={drawer.metricId}
          title={drawer.title}
          sourceLabel="GA4"
          getSeries={getSeries(drawer.metricId)}
          getCompareSeries={async () => []}
        />
      )}
    </div>
  );
}
function KpiCard({ title, metricId, Icon, open, format, comparisonLabel }: any) {
  const { data, loading } = useKpi({ metric: metricId });
  const displayValue = (() => {
    const raw = data?.value;
    if (raw === undefined || raw === null) return null;
    if (typeof raw === "number") return format ? format(raw) : raw.toLocaleString("sv-SE");
    return raw;
  })();

  return (
    <div className={cn("relative")}>      
      {loading && (
        <div className="absolute inset-0 animate-pulse">
          <div className="h-full w-full rounded-[5px] bg-neutral-100 dark:bg-neutral-800" />
        </div>
      )}
      <ScoreCard
        label={title}
        value={displayValue ?? "—"}
        growthRate={data?.growthRate ?? 0}
        Icon={Icon}
        variant="default"
        size="compact"
        appearance="analytics"
        source="GA4"
        onClick={open}
        comparisonLabel={comparisonLabel}
      />
    </div>
  );
}

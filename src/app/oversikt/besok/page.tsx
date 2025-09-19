"use client";

import { useState } from "react";
import { useFilters } from "@/components/GlobalFilters";
import { ScoreCard } from "@/components/ui/scorecard";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import * as overviewIcons from "@/app/(home)/_components/overview-cards/icons";
import { getKpi } from "@/lib/resolver";

export default function Page() {
  const { state } = useFilters();
  const range = state.range as any;
  const [drawer, setDrawer] = useState<{ metricId: string; title: string } | null>(null);

  // Helper to fetch series for sparkline and drawer
  const getSeries = (metricId: string) => async ({ start, end, grain, filters }: any) => {
    const res = await getKpi({ metric: metricId as any, range: { start, end, grain }, filters });
    return res.timeseries.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
  };

  // Values come from summary of current state
  // If metric isn't implemented in resolver, show 0 and leave TODO
  const useValue = async (metricId: string) => {
    const res = await getKpi({ metric: metricId as any, range, filters: state });
    return { value: res.summary.current, growthRate: res.summary.yoyPct ?? 0 };
  };

  // Get comparison label based on current comparison mode
  const getComparisonLabel = () => {
    switch (state.range.comparisonMode) {
      case 'yoy': return 'vs. previous year';
      case 'prev': return 'vs. previous period';
      default: return 'vs. previous period';
    }
  };

  // NOTE: For minimal diff, compute values via async IIFE pattern in components
  // Keeping UI responsive with placeholders

  const cards = [
    { id: "sessions", title: "Sessions", Icon: overviewIcons.Views, format: (v: number) => v.toLocaleString("sv-SE") },
    { id: "engagedSessions", title: "Engaged Sessions", Icon: overviewIcons.Profit, format: (v: number) => v.toLocaleString("sv-SE") },
    { id: "engagementRate", title: "Engagement rate", Icon: overviewIcons.ClarityScore, format: (v: number) => `${v.toFixed(1)}%` },
    { id: "avgEngagementTime", title: "Avg engagement time / session", Icon: overviewIcons.CwvTotalStatus, format: (v: number) => `${Math.floor(v / 60)}m ${Math.round(v % 60)}s` },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((c, idx) => (
        <AsyncCard
          key={idx}
          title={c.title}
          metricId={c.id}
          Icon={c.Icon}
          open={() => setDrawer({ metricId: c.id, title: c.title })}
          getSeries={undefined}
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
          sourceLabel="Mock"
          getSeries={getSeries(drawer.metricId)}
          getCompareSeries={async () => []}
        />
      )}
    </div>
  );
}

function AsyncCard({ title, metricId, Icon, open, getSeries, format, comparisonLabel }: any) {
  const { state } = useFilters();
  const range = state.range as any;
  const [data, setData] = useState<{ value: number | string; growthRate: number } | null>(null);

  if (!data) {
    // Use resolver for all metrics
    getKpi({ metric: metricId as any, range, filters: state }).then((res) => {
      const raw = res.summary.current;
      const formatted = typeof raw === "number" ? (format ? format(raw) : raw.toLocaleString("sv-SE")) : raw;
      setData({ value: formatted, growthRate: res.summary.yoyPct ?? 0 });
    }).catch((error) => {
      console.error(`Error loading ${metricId}:`, error);
      // Fallback to placeholder
      setData({ value: "—", growthRate: 0 });
    });
  }

  return (
    <ScoreCard
      label={title}
      value={data ? data.value : "—"}
      growthRate={data ? data.growthRate : 0}
      Icon={Icon}
      variant="default"
      size="compact"
      appearance="analytics"
      source="Mock"
      onClick={open}
      getSeries={undefined}
      comparisonLabel={comparisonLabel}
    />
  );
}



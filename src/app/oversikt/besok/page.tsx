"use client";

import { useState } from "react";
import { useFilters } from "@/components/GlobalFilters";
import { ScoreCard } from "@/components/ui/scorecard";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import * as overviewIcons from "@/app/(home)/_components/overview-cards/icons";

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
          sourceLabel="GA4"
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
    // Use API endpoint for GA4 metrics
    const params = new URLSearchParams({
      metric: metricId,
      start: range.start,
      end: range.end,
      grain: range.grain || 'day',
      comparisonMode: range.comparisonMode || 'yoy'
    });
    
    fetch(`${window.location.origin}/api/kpi?${params}`).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.summary.current;
      const formatted = typeof raw === "number" ? (format ? format(raw) : raw.toLocaleString("sv-SE")) : raw;
      setData({ value: formatted, growthRate: data.summary.yoyPct ?? 0 });
    }).catch((error) => {
      console.error(`Error loading ${metricId}:`, error);
      // Show NoData when API fails
      setData({ value: "NoData", growthRate: 0 });
    });
  }

  return (
    <ScoreCard
      label={title}
      value={data ? data.value : "NoData"}
      growthRate={data ? data.growthRate : 0}
      Icon={Icon}
      variant="default"
      size="compact"
      appearance="analytics"
      source="GA4"
      onClick={open}
      getSeries={undefined}
      comparisonLabel={comparisonLabel}
    />
  );
}



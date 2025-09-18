"use client";

import { useEffect, useMemo, useState } from "react";
import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import { ClarityScoreCard } from "./clarity-score-card";
import { CwvTotalStatusCard } from "@/components/shared/CwvTotalStatusCard";
import { useCwvData } from "@/hooks/useCwvData";
import { useClarityData } from "@/hooks/useClarityData";
import { getKpi } from "@/lib/resolver";
import * as icons from "./icons";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import { useFilters } from "@/components/GlobalFilters";
import { generateTimeseries, aggregate } from "@/lib/mockData/generators";

type OverviewData = {
  views: { value: number; growthRate: number };
  profit: { value: number; growthRate: number };
  products: { value: number; growthRate: number };
  users: { value: number; growthRate: number };
};

export function OverviewCardsGroup() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const { summary: cwvSummary, loading: cwvLoading } = useCwvData();
  const { clarityScore, loading: clarityLoading } = useClarityData();
  const { state } = useFilters();
  const [drawer, setDrawer] = useState<{ metricId: string; title: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const overview = await getOverviewData();
      setOverviewData(overview);
    };
    loadData();
  }, []);

  // Minimal providers mapping → returns series aligned with TimeSeries widget style
  const providers = useMemo(() => ({
    mau: async ({ start, end, grain, filters }: any) => {
      const res = await getKpi({ metric: "mau", range: { start, end, grain, comparisonMode: state.range.comparisonMode }, filters });
      return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    pageviews: async ({ start, end, grain, filters }: any) => {
      const res = await getKpi({ metric: "pageviews", range: { start, end, grain, comparisonMode: state.range.comparisonMode }, filters });
      return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    // For demo metrics without server-backed series, reuse mock generator
    // Deterministic and metric-specific by using different base/seasonality
    ndi: async ({ start, end, grain }: any) => {
      const daily = generateTimeseries({ start, end }, { base: 450, seasonalityByMonth: [0.95,1.0,1.02,1.05,1.06,1.04,0.97,0.99,1.01,1.03,1.05,1.02], noise: 0.05, seedKey: "ndi" });
      const agg = aggregate(daily, grain);
      return agg.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    tasks: async ({ start, end, grain }: any) => {
      const daily = generateTimeseries({ start, end }, { base: 1200, seasonalityByMonth: [0.9,0.92,0.95,1.0,1.1,1.15,1.2,1.18,1.05,0.98,0.95,0.92], noise: 0.08, seedKey: "tasks" });
      const agg = aggregate(daily, grain);
      return agg.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    features: async ({ start, end, grain }: any) => {
      const daily = generateTimeseries({ start, end }, { base: 80, seasonalityByMonth: [0.8,0.85,0.9,0.95,1.0,1.05,1.2,1.25,1.1,1.0,0.95,0.9], noise: 0.1, seedKey: "features" });
      const agg = aggregate(daily, grain);
      return agg.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    clarity: async ({ start, end, grain }: any) => {
      const daily = generateTimeseries({ start, end }, { base: 70, seasonalityByMonth: [0.95,0.96,0.98,1.0,1.02,1.03,1.04,1.05,1.03,1.01,0.99,0.98], noise: 0.04, seedKey: "clarity" });
      const agg = aggregate(daily, grain);
      // clamp to 0..100
      return agg.map((p) => ({ x: new Date(p.date).getTime(), y: Math.max(0, Math.min(100, p.value)) }));
    },
    cwv_total: async ({ start, end, grain }: any) => {
      const daily = generateTimeseries({ start, end }, { base: 65, seasonalityByMonth: [0.9,0.92,0.95,1.0,1.05,1.08,1.1,1.12,1.1,1.05,0.98,0.95], noise: 0.06, seedKey: "cwv_total" });
      const agg = aggregate(daily, grain);
      return agg.map((p) => ({ x: new Date(p.date).getTime(), y: Math.max(0, Math.min(100, p.value)) }));
    },
  }), [state.range.comparisonMode]);

  if (!overviewData || clarityLoading || cwvLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const { views, profit, products, users } = overviewData;

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      {/* Clarity Score - First and most prominent card */}
      {clarityScore && (
        <ClarityScoreCard
          label="Clarity Score"
          data={{
            value: `${clarityScore.score} / 100`,
            growthRate: 0, // TODO: Add growth rate to clarity score
            grade: clarityScore.grade
          }}
          Icon={icons.ClarityScore}
          // open drawer
          onClick={() => setDrawer({ metricId: "clarity", title: "Clarity Score" })}
          // no sparkline on this card
        />
      )}

      {/* CWV Total Status - Second prominent card */}
      {cwvSummary && (
        <CwvTotalStatusCard
          label="CWV total status"
          data={{
            value: `${cwvSummary.totalStatus.percentage}%`,
            percentage: cwvSummary.totalStatus.percentage,
            status: cwvSummary.totalStatus.percentage >= 75 ? 'Pass' : 'Needs Improvement',
            target: "> 75%",
            description: "Klarar alla tre"
          }}
          Icon={icons.CwvTotalStatus}
          onClick={() => setDrawer({ metricId: "cwv_total", title: "CWV total status" })}
          // no sparkline on this card
        />
      )}

      <OverviewCard
        label="Total Views"
        data={{
          ...views,
          value: compactFormat(views.value),
        }}
        Icon={icons.Views}
        variant="success"
        // Pageviews metric
        onClick={() => setDrawer({ metricId: "pageviews", title: "Sidvisningar" })}
        // Provide sparkline data
        getSeries={providers.pageviews}
      />

      <OverviewCard
        label="Total Profit"
        data={{
          ...profit,
          value: "$" + compactFormat(profit.value),
        }}
        Icon={icons.Profit}
        variant="warning"
        // Treat as Tasks (mock) for demo
        onClick={() => setDrawer({ metricId: "tasks", title: "Tasks" })}
        getSeries={providers.tasks}
      />

      <OverviewCard
        label="Total Products"
        data={{
          ...products,
          value: compactFormat(products.value),
        }}
        Icon={icons.Product}
        variant="info"
        onClick={() => setDrawer({ metricId: "features", title: "Funktioner" })}
        getSeries={providers.features}
      />

      <OverviewCard
        label="Total Users"
        data={{
          ...users,
          value: compactFormat(users.value),
        }}
        Icon={icons.Users}
        variant="primary"
        onClick={() => setDrawer({ metricId: "mau", title: "Användare (MAU)" })}
        getSeries={providers.mau}
      />

      {drawer && (
        <ScorecardDetailsDrawer
          open={!!drawer}
          onClose={() => setDrawer(null)}
          metricId={drawer.metricId}
          title={drawer.title}
          sourceLabel={drawer.metricId === "clarity" ? "Mock" : "Mock"}
          getSeries={providers[drawer.metricId as keyof typeof providers]}
          getCompareSeries={async (args) => {
            // Where resolver provides compare series, align by index
            if (drawer.metricId === "mau" || drawer.metricId === "pageviews") {
              const { getKpi } = await import("@/lib/resolver");
              const res = await getKpi({ metric: drawer.metricId as any, range: { start: args.start, end: args.end, grain: args.grain, comparisonMode: state.range.comparisonMode }, filters: args.filters });
              const points = res.compareTimeseries || [];
              const mainSeries = await providers[drawer.metricId as keyof typeof providers](args);
              return points.map((p, i) => ({ x: mainSeries[i]?.x ?? new Date(p.date).getTime(), y: p.value }));
            }
            return [];
          }}
        />
      )}
    </div>
  );
}

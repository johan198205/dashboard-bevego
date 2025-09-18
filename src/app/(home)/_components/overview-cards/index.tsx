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
    ndi: async ({ start, end, grain }: any) => {
      // Mock NDI trend
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const step = grain === "month" ? 1000 * 60 * 60 * 24 * 30 : grain === "week" ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24;
      const data: { x: number; y: number }[] = [];
      for (let t = s; t <= e; t += step) data.push({ x: t, y: 60 + Math.round(Math.random() * 30) });
      return data;
    },
    tasks: async ({ start, end, grain }: any) => {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const step = grain === "month" ? 1000 * 60 * 60 * 24 * 30 : grain === "week" ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24;
      const data: { x: number; y: number }[] = [];
      for (let t = s; t <= e; t += step) data.push({ x: t, y: 100 + Math.round(Math.random() * 80) });
      return data;
    },
    features: async ({ start, end, grain }: any) => {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const step = grain === "month" ? 1000 * 60 * 60 * 24 * 30 : grain === "week" ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24;
      const data: { x: number; y: number }[] = [];
      for (let t = s; t <= e; t += step) data.push({ x: t, y: 10 + Math.round(Math.random() * 20) });
      return data;
    },
    clarity: async ({ start, end, grain }: any) => {
      // Mock clarity score timeline 0-100
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const step = grain === "month" ? 1000 * 60 * 60 * 24 * 30 : grain === "week" ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24;
      const data: { x: number; y: number }[] = [];
      for (let t = s; t <= e; t += step) data.push({ x: t, y: 60 + Math.round(Math.random() * 40) });
      return data;
    },
    cwv_total: async ({ start, end, grain }: any) => {
      // Mock percentage 0-100
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const step = grain === "month" ? 1000 * 60 * 60 * 24 * 30 : grain === "week" ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24;
      const data: { x: number; y: number }[] = [];
      for (let t = s; t <= e; t += step) data.push({ x: t, y: 50 + Math.round(Math.random() * 50) });
      return data;
    },
  }), [state.range.comparisonMode]);

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
          // @ts-expect-error preserve public API on this specific card component
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
          // @ts-expect-error minimal click passthrough
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
        // @ts-expect-error underlying ScoreCard supports onClick
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
        // @ts-expect-error click passthrough
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
        // @ts-expect-error click passthrough
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
        // @ts-expect-error click passthrough
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
              return points.map((p, i) => ({ x: (await providers[drawer.metricId as keyof typeof providers](args))[i]?.x ?? new Date(p.date).getTime(), y: p.value }));
            }
            return [];
          }}
        />
      )}
    </div>
  );
}

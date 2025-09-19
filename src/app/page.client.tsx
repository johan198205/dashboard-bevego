"use client";
import { useState } from "react";
import TotalDiffCard from "@/widgets/TotalDiffCard";
// TODO(modal): Re-enable chart via modal on card
// import TimeSeries from "@/widgets/TimeSeries";
// import ChannelTable from "@/widgets/ChannelTable";
// Tables moved to Användning page only
// import TasksTable from "@/widgets/TasksTable";
// import FeaturesTable from "@/widgets/FeaturesTable";
import NdiCard from "@/widgets/NdiCard";
// TODO: Re-enable these cards if needed
// import PerfCard from "@/widgets/PerfCard";
// import WcagCard from "@/widgets/WcagCard";
import { useFilters } from "@/components/GlobalFilters";
import { ClarityScoreCard } from "./(home)/_components/overview-cards/clarity-score-card";
import { CwvTotalStatusCard } from "@/components/shared/CwvTotalStatusCard";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import { useClarityData } from "@/hooks/useClarityData";
import { useCwvData } from "@/hooks/useCwvData";
import * as overviewIcons from "./(home)/_components/overview-cards/icons";

export default function ClientHome() {
  const { state } = useFilters();
  const range = state.range;
  const { clarityScore } = useClarityData();
  const { summary: cwvSummary } = useCwvData();
  const [drawer, setDrawer] = useState<{ metricId: string; title: string } | null>(null);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TotalDiffCard title="Användare (MAU)" metric="mau" range={range} />
      <TotalDiffCard title="Användning — Sidvisningar" metric="pageviews" range={range} />
      <div className="row-span-2">
        <NdiCard range={range} />
      </div>

      {/* TODO(modal): Re-enable chart via modal on card */}
      {/* <TimeSeries title="MAU — trend" metric="mau" range={range} /> */}
      {/* <TimeSeries title="Sidvisningar — tidsserie" metric="pageviews" range={range} /> */}
      {/* <ChannelTable metric="pageviews" range={range} /> */}

      <TotalDiffCard title="Tasks" metric="tasks" range={range} />
      <TotalDiffCard title="Funktioner" metric="features" range={range} />

      {/* Added: Clarity Score card (placed last as requested) */}
      {clarityScore && (
        <ClarityScoreCard
          label="Clarity Score"
          data={{
            value: `${clarityScore.score} / 100`,
            growthRate: 0,
            grade: clarityScore.grade,
          }}
          Icon={overviewIcons.ClarityScore}
          onClick={() => setDrawer({ metricId: "clarity", title: "Clarity Score" })}
        />
      )}

      {/* Added: CWV total status card (placed last as requested) */}
      {cwvSummary && (
        <CwvTotalStatusCard
          label="CWV total status"
          data={{
            value: `${cwvSummary.totalStatus.percentage}%`,
            percentage: cwvSummary.totalStatus.percentage,
            status:
              cwvSummary.totalStatus.percentage >= 75
                ? "Pass"
                : "Needs Improvement",
            target: "> 75%",
            description: "Klarar alla tre",
          }}
          Icon={overviewIcons.CwvTotalStatus}
          onClick={() => setDrawer({ metricId: "cwv_total", title: "CWV total status" })}
        />
      )}
      {drawer && (
        <ScorecardDetailsDrawer
          open={!!drawer}
          onClose={() => setDrawer(null)}
          metricId={drawer.metricId}
          title={drawer.title}
          sourceLabel="Mock"
          showChart={false}
          // Provide a simple flat mock series so AI-insikter inte visar 0
          getSeries={async ({ start, end }: any) => {
            const s = new Date(start).getTime();
            const e = new Date(end).getTime();
            const day = 1000 * 60 * 60 * 24;
            const points: { x: number; y: number }[] = [];
            const base = drawer.metricId === "clarity" ? (clarityScore?.score ?? 75) : (cwvSummary?.totalStatus.percentage ?? 65);
            for (let t = s; t <= e; t += day) {
              const noise = Math.random() * 2 - 1; // small ±1 variation
              points.push({ x: t, y: Math.max(0, Math.min(100, Math.round(base + noise))) });
            }
            return points;
          }}
          getCompareSeries={async () => []}
        />
      )}

      {/* Tables moved to Användning page only */}
      {/* <TasksTable range={range} /> */}
      {/* <FeaturesTable range={range} /> */}

      {/* TODO: Re-enable these cards if needed
      <PerfCard title="Svarstid" value="420 ms" note="Placeholder" />
      <PerfCard title="Uptime" value="99,6%" note="Placeholder" />
      <WcagCard />
      */}
    </div>
  );
}



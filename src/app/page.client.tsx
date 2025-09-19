"use client";
import { useState } from "react";
import TotalDiffCard from "@/widgets/TotalDiffCard";
import GaugeCard from "@/widgets/GaugeCard";
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
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import { useClarityData } from "@/hooks/useClarityData";
import * as overviewIcons from "./(home)/_components/overview-cards/icons";

export default function ClientHome() {
  const { state } = useFilters();
  const range = state.range;
  const { clarityScore } = useClarityData();
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

      <GaugeCard title="Tasks" metric="tasks_rate" range={range} />
      <GaugeCard title="Funktioner" metric="features_rate" range={range} />

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
      <GaugeCard title="CWV total status" metric="cwv_total" range={range} />
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
            const base = clarityScore?.score ?? 75;
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



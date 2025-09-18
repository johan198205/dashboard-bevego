"use client";
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
import { useClarityData } from "@/hooks/useClarityData";
import { useCwvData } from "@/hooks/useCwvData";
import * as overviewIcons from "./(home)/_components/overview-cards/icons";

export default function ClientHome() {
  const { state } = useFilters();
  const range = state.range;
  const { clarityScore } = useClarityData();
  const { summary: cwvSummary } = useCwvData();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TotalDiffCard title="Användare (MAU)" metric="mau" range={range} />
      <TotalDiffCard title="Användning — Sidvisningar" metric="pageviews" range={range} />
      <NdiCard range={range} />

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



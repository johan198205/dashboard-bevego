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

export default function ClientHome() {
  const { state } = useFilters();
  const range = state.range;
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



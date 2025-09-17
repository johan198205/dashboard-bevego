"use client";
import TotalDiffCard from "@/widgets/TotalDiffCard";
import TimeSeries from "@/widgets/TimeSeries";
import ChannelTable from "@/widgets/ChannelTable";
import TasksTable from "@/widgets/TasksTable";
import FeaturesTable from "@/widgets/FeaturesTable";
import NdiCard from "@/widgets/NdiCard";
import PerfCard from "@/widgets/PerfCard";
import WcagCard from "@/widgets/WcagCard";
import { useFilters } from "@/components/GlobalFilters";

export default function Page() {
  const { state } = useFilters();
  const range = state.range;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TotalDiffCard title="Användare (MAU)" metric="mau" range={range} />
      <TotalDiffCard title="Användning — Sidvisningar" metric="pageviews" range={range} />
      <NdiCard range={range} />

      <TimeSeries title="MAU — trend" metric="mau" range={range} />
      <TimeSeries title="Sidvisningar — tidsserie" metric="pageviews" range={range} />
      <ChannelTable metric="pageviews" range={range} />

      <TasksTable range={range} />
      <FeaturesTable range={range} />

      <PerfCard title="Svarstid" value="420 ms" note="Placeholder" />
      <PerfCard title="Uptime" value="99,6%" note="Placeholder" />
      <WcagCard />
    </div>
  );
}

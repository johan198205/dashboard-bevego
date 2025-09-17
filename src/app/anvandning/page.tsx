"use client";
import TimeSeries from "@/widgets/TimeSeries";
import TasksTable from "@/widgets/TasksTable";
import FeaturesTable from "@/widgets/FeaturesTable";
import { useFilters } from "@/components/GlobalFilters";

export default function Page() {
  const { state } = useFilters();
  const range = state.range;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <TimeSeries title="Sidvisningar — tidsserie" metric="pageviews" range={range} />
      <div className="grid grid-cols-1 gap-4">
        <TasksTable range={range} />
        <FeaturesTable range={range} />
      </div>
    </div>
  );
}



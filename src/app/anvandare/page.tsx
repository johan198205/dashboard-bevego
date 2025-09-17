"use client";
import TimeSeries from "@/widgets/TimeSeries";
import ChannelTable from "@/widgets/ChannelTable";
import { useFilters } from "@/components/GlobalFilters";

export default function Page() {
  const { state } = useFilters();
  const range = state.range;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <TimeSeries title="MAU — trend" metric="mau" range={range} />
      <ChannelTable metric="mau" range={range} />
    </div>
  );
}

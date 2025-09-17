"use client";
import NdiCard from "@/widgets/NdiCard";
import { useFilters } from "@/components/GlobalFilters";

export default function Page() {
  const { state } = useFilters();
  const range = state.range;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <NdiCard range={range} />
      <div className="card">
        <div className="title">NDI heatmap/tabell</div>
        <div className="text-sm text-gray-600">Dummy — kommer senare.</div>
      </div>
    </div>
  );
}



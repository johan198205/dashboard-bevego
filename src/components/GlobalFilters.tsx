"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { Grain } from "@/lib/types";
import FilterDropdown from "./FilterDropdown";

type FilterState = {
  range: { start: string; end: string; compareYoy: boolean; grain: Grain };
  audience: string[];
  device: string[];
  channel: string[];
};

type FiltersContextType = {
  state: FilterState;
  setState: (fn: (prev: FilterState) => FilterState) => void;
};

const FiltersContext = createContext<FiltersContextType | null>(null);

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const today = new Date();
  const start = new Date(today);
  start.setMonth(start.getMonth() - 1);
  const initial: FilterState = {
    range: { start: start.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10), compareYoy: true, grain: "day" },
    audience: [],
    device: [],
    channel: [],
  };
  const [state, setStateRaw] = useState<FilterState>(initial);
  const value = useMemo(() => ({ state, setState: (fn: (prev: FilterState) => FilterState) => setStateRaw((p) => fn(p)) }), [state]);
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export default function GlobalFilters() {
  const { state, setState } = useFilters();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="card filter-box">
        <span className="title">Datumintervall</span>
        <input
          type="date"
          value={state.range.start}
          onChange={(e) => setState((p) => ({ ...p, range: { ...p.range, start: e.target.value } }))}
          className="rounded border px-2 py-1"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={state.range.end}
          onChange={(e) => setState((p) => ({ ...p, range: { ...p.range, end: e.target.value } }))}
          className="rounded border px-2 py-1"
        />
      </div>

      <label className="card filter-box">
        <input
          type="checkbox"
          checked={state.range.compareYoy}
          onChange={(e) => setState((p) => ({ ...p, range: { ...p.range, compareYoy: e.target.checked } }))}
        />
        <span className="title">Visa YoY</span>
      </label>

      <div className="card filter-box">
        <select
          value={state.range.grain}
          onChange={(e) => setState((p) => ({ ...p, range: { ...p.range, grain: e.target.value as Grain } }))}
          className="bg-transparent outline-none border-none text-sm"
        >
          <option value="day">Dag</option>
          <option value="week">Vecka</option>
          <option value="month">Månad</option>
        </select>
      </div>

      <FilterDropdown
        label="Roll"
        items={[
          { value: "Styrelse", label: "Styrelse" },
          { value: "Medlem", label: "Medlem" },
          { value: "Leverantör", label: "Leverantör" },
          { value: "Förvaltare", label: "Förvaltare" },
        ]}
        values={state.audience}
        onChange={(values) => setState((p) => ({ ...p, audience: values }))}
      />

      <FilterDropdown
        label="Enhet"
        items={[
          { value: "Desktop", label: "Desktop" },
          { value: "Mobil", label: "Mobil" },
          { value: "Surfplatta", label: "Surfplatta" },
        ]}
        values={state.device}
        onChange={(values) => setState((p) => ({ ...p, device: values }))}
      />

      <FilterDropdown
        label="Kanal"
        items={[
          { value: "Direkt", label: "Direkt" },
          { value: "Organiskt", label: "Organiskt" },
          { value: "Kampanj", label: "Kampanj" },
          { value: "E-post", label: "E-post" },
        ]}
        values={state.channel}
        onChange={(values) => setState((p) => ({ ...p, channel: values }))}
      />
    </div>
  );
}



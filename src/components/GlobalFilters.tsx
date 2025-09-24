"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { Grain } from "@/lib/types";
import FilterDropdown from "./FilterDropdown";

type FilterState = {
  range: { start: string; end: string; compareYoy: boolean; comparisonMode: 'none' | 'yoy' | 'prev'; grain: Grain };
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
    range: { start: start.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10), compareYoy: true, comparisonMode: 'yoy', grain: "day" },
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
  const [preset, setPreset] = useState<string>("");
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  };
  const lastNDays = (n: number) => {
    const end = new Date();
    const start = addDays(end, -(n - 1));
    return { start: toIso(start), end: toIso(end) };
  };
  const yesterday = () => {
    const end = addDays(new Date(), -1);
    return { start: toIso(end), end: toIso(end) };
  };
  const today = () => {
    const d = new Date();
    return { start: toIso(d), end: toIso(d) };
  };
  const lastTwelveMonths = () => {
    const end = new Date();
    const start = new Date(end);
    // Start from the next day after the same date 12 months ago (GA4-like rolling window)
    start.setFullYear(start.getFullYear() - 1);
    const startPlusOne = addDays(start, 1);
    return { start: toIso(startPlusOne), end: toIso(end) };
  };
  const lastQuarter = () => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    let year = now.getFullYear();
    let prevQuarter = currentQuarter - 1;
    if (prevQuarter === 0) {
      prevQuarter = 4;
      year -= 1;
    }
    const quarterStartMonth = (prevQuarter - 1) * 3; // 0,3,6,9
    const start = new Date(year, quarterStartMonth, 1);
    // End is last day of quarter: first day of next quarter minus 1 day
    const nextQuarterStart =
      prevQuarter === 4 ? new Date(year + 1, 0, 1) : new Date(year, quarterStartMonth + 3, 1);
    const end = addDays(nextQuarterStart, -1);
    return { start: toIso(start), end: toIso(end) };
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3" suppressHydrationWarning>
      <div className="card filter-box">
        <span className="title">Datumintervall</span>
        <input
          type="date"
          value={state.range.start}
          onChange={(e) => {
            setPreset("");
            setState((p) => ({ ...p, range: { ...p.range, start: e.target.value } }));
          }}
          className="rounded border px-2 py-1"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={state.range.end}
          onChange={(e) => {
            setPreset("");
            setState((p) => ({ ...p, range: { ...p.range, end: e.target.value } }));
          }}
          className="rounded border px-2 py-1"
        />
        <select
          className="ml-2 rounded border px-2 py-1"
          value={preset}
          onChange={(e) => {
            const val = e.target.value;
            if (!val) return;
            let r: { start: string; end: string } | null = null;
            if (val === "today") r = today();
            else if (val === "yesterday") r = yesterday();
            else if (val === "last7") r = lastNDays(7);
            else if (val === "last28") r = lastNDays(28);
            else if (val === "last30") r = lastNDays(30);
            else if (val === "last90") r = lastNDays(90);
            else if (val === "last12m") r = lastTwelveMonths();
            else if (val === "lastQ") r = lastQuarter();
            if (r) {
              setState((p) => ({ ...p, range: { ...p.range, start: r!.start, end: r!.end } }));
            }
            setPreset(val);
          }}
        >
          <option value="">Välj...</option>
          <option value="today">Idag</option>
          <option value="yesterday">Igår</option>
          <option value="last7">Senaste 7 dagarna</option>
          <option value="last28">Senaste 28 dagarna</option>
          <option value="last30">Senaste 30 dagarna</option>
          <option value="last90">Senaste 90 dagarna</option>
          <option value="last12m">Senaste 12 månaderna</option>
          <option value="lastQ">Senaste kvartalet</option>
        </select>
      </div>

      <div className="card filter-box">
        <span className="title">Jämförelse</span>
        <select
          className="rounded border px-2 py-1"
          value={state.range.comparisonMode}
          onChange={(e) => {
            const mode = e.target.value as 'none' | 'yoy' | 'prev';
            setState((p) => ({ ...p, range: { ...p.range, comparisonMode: mode, compareYoy: mode === 'yoy' } }));
          }}
        >
          <option value="none">Ingen</option>
          <option value="yoy">YoY</option>
          <option value="prev">Föregående period</option>
        </select>
      </div>

      {/* Removed global Dag/Vecka/Månad filter per requirement. Local controls are provided within each chart widget. */}

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



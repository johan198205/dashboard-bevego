export type KpiPoint = { date: string; value: number; segment?: string };

export type Diff = { current: number; prev: number; yoyPct: number };

export type BreakdownRow = { key: string; value: number; yoyPct?: number };

export type KpiResponse = {
  meta: { source: 'mock'; metric: string; dims: string[] };
  summary: Diff;
  timeseries: KpiPoint[];
  // Optional comparison series aligned to the same grain as timeseries
  // When provided, this represents either YoY or previous-period series depending on Params.range.comparisonMode
  compareTimeseries?: KpiPoint[];
  breakdown?: BreakdownRow[];
  notes?: string[];
};

export type Grain = 'day' | 'week' | 'month';

export type Filters = {
  audience?: string[];
  device?: string[];
  channel?: string[];
  task?: string[];
  feature?: string[];
};

export type Params = {
  metric: 'mau' | 'pageviews' | 'tasks' | 'features' | 'ndi' | 'perf';
  range: {
    start: string;
    end: string;
    // Deprecated: kept for backward compatibility with existing props/selectors
    compareYoy?: boolean;
    // New unified comparison selector
    comparisonMode?: 'none' | 'yoy' | 'prev';
    grain?: Grain;
  };
  filters?: Filters;
};



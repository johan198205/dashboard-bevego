export type KpiPoint = { date: string; value: number; segment?: string };

export type Diff = { current: number; prev: number; yoyPct: number };

export type BreakdownRow = { key: string; value: number; yoyPct?: number };

export type KpiResponse = {
  meta: { source: 'mock' | 'ga4'; metric: string; dims: string[] };
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
  metric: 'mau' | 'pageviews' | 'tasks' | 'features' | 'ndi' | 'perf' | 'users' | 'tasks_rate' | 'features_rate' | 'cwv_total' | 'sessions' | 'engagedSessions' | 'engagementRate' | 'avgEngagementTime';
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

// Core Web Vitals types
export type CwvStatus = 'Pass' | 'Needs Improvement' | 'Fail';

export type CwvSummary = {
  lcp: {
    p75: number; // in ms
    status: CwvStatus;
    target: number; // 2500ms
  };
  inp: {
    p75: number; // in ms
    status: CwvStatus;
    target: number; // 200ms
  };
  cls: {
    p75: number; // score
    status: CwvStatus;
    target: number; // 0.1
  };
  ttfb: {
    p75: number; // in ms
    status: CwvStatus;
    target: number; // 800ms
  };
  passedPages: {
    count: number;
    percentage: number;
  };
  totalStatus: {
    percentage: number; // % that pass all three metrics
  };
  source: 'Mock' | 'GA4 API' | 'BigQuery' | 'CrUX API';
  period?: string; // Actual data collection period from CrUX
};

export type CwvTrendPoint = {
  date: string;
  lcp: number;
  inp: number;
  cls: number;
};

export type CwvUrlGroupRow = {
  url: string;
  lcp: {
    p75: number;
    status: CwvStatus;
  };
  inp: {
    p75: number;
    status: CwvStatus;
  };
  cls: {
    p75: number;
    status: CwvStatus;
  };
  overallStatus: CwvStatus;
  sessions?: number;
  lastTested: string;
  source: 'Mock' | 'GA4 API' | 'BigQuery';
};

// Microsoft Clarity types
export type ClarityOverview = {
  // Core metrics
  sessions: number;
  uniqueUsers: number;
  pagesPerSession: number;
  avgScrollDepth: number; // percentage
  avgEngagementTime: number; // in seconds
  totalTimeSpent: number; // in seconds
  
  // User behavior insights
  rageClicks: {
    sessions: number; // number of sessions with rage clicks
    percentage: number; // % of sessions
  };
  deadClicks: {
    sessions: number; // number of sessions with dead clicks
    percentage: number; // % of sessions
  };
  excessiveScrolling: {
    sessions: number; // number of sessions with excessive scrolling
    percentage: number; // % of sessions
  };
  quickBack: {
    sessions: number; // number of sessions with quick back
    percentage: number; // % of sessions
  };
  
  // Technical metrics
  scriptErrors: {
    sessions: number; // number of sessions with script errors
    percentage: number; // % of sessions
    totalErrors: number; // total number of errors
  };
  botTraffic: {
    sessions: number; // number of bot sessions
    percentage: number; // % of total sessions
  };
  
  // User segments
  newUsers: {
    sessions: number;
    percentage: number;
  };
  returningUsers: {
    sessions: number;
    percentage: number;
  };
  
  source: 'Mock' | 'Clarity API';
  dataPoints?: number;
  dateRange?: {
    start: string;
    end: string;
  };
};

export type ClarityTrendPoint = {
  date: string;
  sessions: number;
  engagementTime: number; // in seconds
  scrollDepth: number; // percentage
  rageClicks: number;
  deadClicks: number;
  quickBack: number; // percentage
  scriptErrors: number;
};

export type ClarityUrlRow = {
  url: string;
  sessions: number;
  engagementTime: number; // in seconds
  scrollDepth: number; // percentage
  rageClicks: {
    count: number;
    per1k: number; // per 1k sessions
  };
  deadClicks: {
    count: number;
    per1k: number; // per 1k sessions
  };
  quickBack: number; // percentage
  scriptErrors: number;
  source: 'Mock' | 'Clarity API';
};

export type ClarityInsight = {
  url: string;
  sessions: number;
  ragePer1k: number;
  deadPer1k: number;
  quickBackPct: number;
  priority: number; // calculated priority score
  source: 'Mock' | 'Clarity API';
};

export type ClarityFilters = {
  device?: string[];
  country?: string[];
  source?: string[];
  browser?: string[];
  os?: string[];
};

export type ClarityParams = {
  range: {
    start: string;
    end: string;
    grain?: 'day' | 'week' | 'month';
  };
  filters?: ClarityFilters;
};

export type ClarityScore = {
  score: number;
  grade: 'Bra' | 'Behöver förbättras' | 'Dålig' | 'N/A';
  parts: {
    rage: number;
    dead: number;
    quickback: number;
    script: number;
    engagement: number;
    scroll: number;
  };
  source: 'Mock' | 'Clarity API';
};



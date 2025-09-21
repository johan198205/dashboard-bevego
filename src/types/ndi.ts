export type Period = `${number}Q${1|2|3|4}`;

export interface NDISummary {
  period: Period;
  total: number;
  qoqChange?: number; // i %
  yoyChange?: number; // i %
  prevQuarterValue?: number; // Previous quarter value for display
  prevYearValue?: number; // Previous year value for display
  rolling4q?: number;
  totalResponses?: number; // Total number of responses for this period
}

export interface NDISeriesPoint {
  period: Period;
  value: number | null;
  r4?: number | null;
  yoy?: number | null; // Same quarter previous year
}

export interface BreakdownRow {
  period: Period;
  groupA?: string;
  groupB?: string;
  groupC?: string;
  value: number;
  weight?: number;
}

export interface BreakdownWithHistory extends BreakdownRow {
  qoqChange?: number; // Quarter over Quarter change in %
  yoyChange?: number; // Year over Year change in %
  prevQuarterValue?: number; // Previous quarter value for display
  prevYearValue?: number; // Previous year value for display
}

export interface FileUploadResponse {
  id: string;
  kind: 'AGGREGATED' | 'BREAKDOWN';
  originalName: string;
  uploadedAt: string;
  period?: string;
  active: boolean;
}

export interface ValidationReport {
  fileId: string;
  detectedPeriods: string[];
  rowCount: number;
  ignoredRows: number;
  columnMapping: {
    groupA?: string;
    groupB?: string;
    groupC?: string;
    value?: string;
    weight?: string;
  };
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  fileId: string;
  validationReport: ValidationReport;
  error?: string;
}

// Area breakdown types for side panel
export interface GenderBreakdown {
  male: { ndi: number; count?: number; percentage?: number };
  female: { ndi: number; count?: number; percentage?: number };
  delta: number; // percentage points difference (male - female)
}

export interface AgeGroupBreakdown {
  [ageGroup: string]: { ndi: number; count?: number; percentage?: number };
}

export interface DeviceBreakdown {
  mobile: { ndi: number; count?: number; percentage?: number };
  desktop: { ndi: number; count?: number; percentage?: number };
}

export interface OSBreakdown {
  android: { ndi: number; count?: number; percentage?: number };
  ios: { ndi: number; count?: number; percentage?: number };
}

export interface BrowserBreakdown {
  chrome: { ndi: number; count?: number; percentage?: number };
  safari: { ndi: number; count?: number; percentage?: number };
  edge: { ndi: number; count?: number; percentage?: number };
  [key: string]: { ndi: number; count?: number; percentage?: number };
}

export interface ResponseDistribution {
  [rating: number]: { 
    count: number; 
    percentage: number; 
    ndiContribution: number; 
    label: string;
  };
}

export interface AreaBreakdown {
  area: string;
  period: Period;
  totalNDI?: number; // Total NDI value for this area
  gender?: GenderBreakdown;
  ageGroups?: AgeGroupBreakdown;
  device?: DeviceBreakdown;
  os?: OSBreakdown;
  browser?: BrowserBreakdown;
  responseDistribution?: ResponseDistribution;
  totalResponses?: number;
  minSampleSize?: number; // From UI settings
}

// Demographic breakdown types for scorecards
export interface DemographicSegment {
  ndi: number | null;
  count?: number;
}

export interface GenderBreakdownScorecard {
  male: DemographicSegment;
  female: DemographicSegment;
  delta: number | null; // percentage points difference (female - male)
}

export interface AgeGroupBreakdownScorecard {
  [ageGroup: string]: DemographicSegment;
}

export interface DeviceBreakdownScorecard {
  mobile: DemographicSegment;
  desktop: DemographicSegment;
  delta: number | null; // percentage points difference (mobile - desktop)
}

export interface OSBreakdownScorecard {
  android: DemographicSegment;
  ios: DemographicSegment;
  delta: number | null; // percentage points difference (ios - android)
}

export interface BrowserBreakdownScorecard {
  chrome: DemographicSegment;
  safari: DemographicSegment;
  edge: DemographicSegment;
}

export interface DemographicBreakdown {
  period: Period;
  gender: GenderBreakdownScorecard;
  ageGroups: AgeGroupBreakdownScorecard;
  device: DeviceBreakdownScorecard;
  os: OSBreakdownScorecard;
  browser: BrowserBreakdownScorecard;
}

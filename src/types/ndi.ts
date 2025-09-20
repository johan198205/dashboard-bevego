export type Period = `${number}Q${1|2|3|4}`;

export interface NDISummary {
  period: Period;
  total: number;
  qoqChange?: number; // i %
  yoyChange?: number; // i %
  rolling4q?: number;
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

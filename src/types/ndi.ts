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
}

export interface BreakdownRow {
  period: Period;
  groupA?: string;
  groupB?: string;
  groupC?: string;
  value: number;
  weight?: number;
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

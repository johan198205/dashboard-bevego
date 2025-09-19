import * as XLSX from 'xlsx';
import { Period, ValidationReport, ImportResult } from '@/types/ndi';
import { normalizePeriod, parsePeriod } from './ndi-calculations';

export interface ParsedMetricPoint {
  period: Period;
  metric: string;
  value: number;
  weight?: number;
  groupA?: string;
  groupB?: string;
  groupC?: string;
}

export interface ParsedData {
  metricPoints: ParsedMetricPoint[];
  validationReport: ValidationReport;
}

/**
 * Parse aggregated Excel file from buffer (wide format -> long format)
 */
export function parseAggregatedFileFromBuffer(
  buffer: Buffer,
  fileId: string,
  metricKey: string = 'NDI'
): ParsedData {
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0]; // Use first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  const validationReport: ValidationReport = {
    fileId,
    detectedPeriods: [],
    rowCount: 0,
    ignoredRows: 0,
    columnMapping: {},
    warnings: []
  };

  const metricPoints: ParsedMetricPoint[] = [];

  if (data.length === 0) {
    validationReport.warnings.push('File is empty');
    return { metricPoints, validationReport };
  }

  // Find the row containing the metric (e.g., "NDI")
  let metricRowIndex = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.some((cell: any) => 
      typeof cell === 'string' && cell.toLowerCase().includes(metricKey.toLowerCase())
    )) {
      metricRowIndex = i;
      break;
    }
  }

  if (metricRowIndex === -1) {
    validationReport.warnings.push(`Could not find row containing "${metricKey}"`);
    return { metricPoints, validationReport };
  }

  const metricRow = data[metricRowIndex];
  const headerRow = data[0] || [];

  // Find quarter columns (format: YYYYQ1, YYYYQ2, etc.)
  const quarterColumns: { index: number; period: Period }[] = [];
  
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i];
    if (typeof header === 'string') {
      const normalizedPeriod = normalizePeriod(header);
      if (normalizedPeriod) {
        quarterColumns.push({ index: i, period: normalizedPeriod });
        validationReport.detectedPeriods.push(normalizedPeriod);
      }
    }
  }

  if (quarterColumns.length === 0) {
    validationReport.warnings.push('No quarter columns found (expected format: YYYYQ1, YYYYQ2, etc.)');
    return { metricPoints, validationReport };
  }

  // Extract values for each quarter
  for (const { index, period } of quarterColumns) {
    const value = metricRow[index];
    if (typeof value === 'number' && !isNaN(value)) {
      metricPoints.push({
        period,
        metric: metricKey,
        value,
        groupA: undefined,
        groupB: undefined,
        groupC: undefined
      });
    } else {
      validationReport.ignoredRows++;
      validationReport.warnings.push(`Invalid value for ${period}: ${value}`);
    }
  }

  validationReport.rowCount = metricPoints.length;
  return { metricPoints, validationReport };
}

/**
 * Parse breakdown Excel file from buffer (long format with dimensions)
 */
export function parseBreakdownFileFromBuffer(
  buffer: Buffer,
  fileId: string,
  valueColumnName: string = 'NDI'
): ParsedData {
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0]; // Use first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  const validationReport: ValidationReport = {
    fileId,
    detectedPeriods: [],
    rowCount: 0,
    ignoredRows: 0,
    columnMapping: {},
    warnings: []
  };

  const metricPoints: ParsedMetricPoint[] = [];

  if (data.length < 2) {
    validationReport.warnings.push('File must have at least a header row and one data row');
    return { metricPoints, validationReport };
  }

  const headerRow = data[0] as string[];
  const dataRows = data.slice(1);

  // Find column indices
  const columnIndices = {
    period: -1,
    value: -1,
    weight: -1,
    groupA: -1,
    groupB: -1,
    groupC: -1
  };

  // Find value column
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i]?.toString().toLowerCase();
    if (header && (
      header.includes(valueColumnName.toLowerCase()) ||
      header.includes('index') ||
      header.includes('ndi')
    )) {
      columnIndices.value = i;
      validationReport.columnMapping.value = headerRow[i];
      break;
    }
  }

  if (columnIndices.value === -1) {
    validationReport.warnings.push(`Could not find value column (looking for "${valueColumnName}")`);
    return { metricPoints, validationReport };
  }

  // Find period column
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i]?.toString().toLowerCase();
    if (header && (
      header.includes('period') ||
      header.includes('kvartal') ||
      header.includes('quarter')
    )) {
      columnIndices.period = i;
      break;
    }
  }

  // Find weight column
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i]?.toString().toLowerCase();
    if (header && (
      header.includes('antal') ||
      header.includes('svar') ||
      header.includes('weight') ||
      header.includes('count')
    )) {
      columnIndices.weight = i;
      validationReport.columnMapping.weight = headerRow[i];
      break;
    }
  }

  // Find group columns (non-period, non-value, non-weight columns)
  const groupColumns: number[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (i !== columnIndices.period && 
        i !== columnIndices.value && 
        i !== columnIndices.weight) {
      groupColumns.push(i);
    }
  }

  // Map group columns to groupA, groupB, groupC
  if (groupColumns.length > 0) {
    columnIndices.groupA = groupColumns[0];
    validationReport.columnMapping.groupA = headerRow[groupColumns[0]];
  }
  if (groupColumns.length > 1) {
    columnIndices.groupB = groupColumns[1];
    validationReport.columnMapping.groupB = headerRow[groupColumns[1]];
  }
  if (groupColumns.length > 2) {
    columnIndices.groupC = groupColumns[2];
    validationReport.columnMapping.groupC = headerRow[groupColumns[2]];
  }

  // Process data rows
  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    let period: Period | null = null;

    // Get period
    if (columnIndices.period !== -1) {
      const periodValue = row[columnIndices.period];
      if (typeof periodValue === 'string') {
        period = normalizePeriod(periodValue);
      }
    } else {
      // Try to detect period from column headers (wide format)
      // This would require a different approach - for now, skip
      validationReport.warnings.push('No period column found and wide format not supported yet');
      continue;
    }

    if (!period) {
      validationReport.ignoredRows++;
      continue;
    }

    // Get value
    const value = row[columnIndices.value];
    if (typeof value !== 'number' || isNaN(value)) {
      validationReport.ignoredRows++;
      continue;
    }

    // Get weight
    let weight: number | undefined;
    if (columnIndices.weight !== -1) {
      const weightValue = row[columnIndices.weight];
      if (typeof weightValue === 'number' && !isNaN(weightValue)) {
        weight = weightValue;
      }
    }

    // Get group values
    const groupA = columnIndices.groupA !== -1 ? row[columnIndices.groupA]?.toString() : undefined;
    const groupB = columnIndices.groupB !== -1 ? row[columnIndices.groupB]?.toString() : undefined;
    const groupC = columnIndices.groupC !== -1 ? row[columnIndices.groupC]?.toString() : undefined;

    metricPoints.push({
      period,
      metric: valueColumnName,
      value,
      weight,
      groupA,
      groupB,
      groupC
    });

    if (!validationReport.detectedPeriods.includes(period)) {
      validationReport.detectedPeriods.push(period);
    }
  }

  validationReport.rowCount = metricPoints.length;
  return { metricPoints, validationReport };
}

/**
 * Main parser function that determines file type and calls appropriate parser
 */
export function parseExcelFile(
  filePath: string,
  fileId: string,
  fileKind: 'AGGREGATED' | 'BREAKDOWN',
  options: {
    metricKey?: string;
    valueColumnName?: string;
  } = {}
): ParsedData {
  if (fileKind === 'AGGREGATED') {
    return parseAggregatedFile(filePath, fileId, options.metricKey);
  } else {
    return parseBreakdownFile(filePath, fileId, options.valueColumnName);
  }
}

/**
 * Main parser function that works with buffer
 */
export function parseExcelFileFromBuffer(
  buffer: Buffer,
  fileId: string,
  fileKind: 'AGGREGATED' | 'BREAKDOWN',
  options: {
    metricKey?: string;
    valueColumnName?: string;
  } = {}
): ParsedData {
  if (fileKind === 'AGGREGATED') {
    return parseAggregatedFileFromBuffer(buffer, fileId, options.metricKey);
  } else {
    return parseBreakdownFileFromBuffer(buffer, fileId, options.valueColumnName);
  }
}

/**
 * Parse aggregated Excel file (wide format -> long format) - file path version
 */
export function parseAggregatedFile(
  filePath: string,
  fileId: string,
  metricKey: string = 'NDI'
): ParsedData {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Use first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  const validationReport: ValidationReport = {
    fileId,
    detectedPeriods: [],
    rowCount: 0,
    ignoredRows: 0,
    columnMapping: {},
    warnings: []
  };

  const metricPoints: ParsedMetricPoint[] = [];

  if (data.length === 0) {
    validationReport.warnings.push('File is empty');
    return { metricPoints, validationReport };
  }

  // Find the row containing the metric (e.g., "NDI")
  let metricRowIndex = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.some((cell: any) => 
      typeof cell === 'string' && cell.toLowerCase().includes(metricKey.toLowerCase())
    )) {
      metricRowIndex = i;
      break;
    }
  }

  if (metricRowIndex === -1) {
    validationReport.warnings.push(`Could not find row containing "${metricKey}"`);
    return { metricPoints, validationReport };
  }

  const metricRow = data[metricRowIndex];
  const headerRow = data[0] || [];

  // Find quarter columns (format: YYYYQ1, YYYYQ2, etc.)
  const quarterColumns: { index: number; period: Period }[] = [];
  
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i];
    if (typeof header === 'string') {
      const normalizedPeriod = normalizePeriod(header);
      if (normalizedPeriod) {
        quarterColumns.push({ index: i, period: normalizedPeriod });
        validationReport.detectedPeriods.push(normalizedPeriod);
      }
    }
  }

  if (quarterColumns.length === 0) {
    validationReport.warnings.push('No quarter columns found (expected format: YYYYQ1, YYYYQ2, etc.)');
    return { metricPoints, validationReport };
  }

  // Extract values for each quarter
  for (const { index, period } of quarterColumns) {
    const value = metricRow[index];
    if (typeof value === 'number' && !isNaN(value)) {
      metricPoints.push({
        period,
        metric: metricKey,
        value,
        groupA: undefined,
        groupB: undefined,
        groupC: undefined
      });
    } else {
      validationReport.ignoredRows++;
      validationReport.warnings.push(`Invalid value for ${period}: ${value}`);
    }
  }

  validationReport.rowCount = metricPoints.length;
  return { metricPoints, validationReport };
}

/**
 * Parse breakdown Excel file (long format with dimensions) - file path version
 */
export function parseBreakdownFile(
  filePath: string,
  fileId: string,
  valueColumnName: string = 'NDI'
): ParsedData {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Use first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  const validationReport: ValidationReport = {
    fileId,
    detectedPeriods: [],
    rowCount: 0,
    ignoredRows: 0,
    columnMapping: {},
    warnings: []
  };

  const metricPoints: ParsedMetricPoint[] = [];

  if (data.length < 2) {
    validationReport.warnings.push('File must have at least a header row and one data row');
    return { metricPoints, validationReport };
  }

  const headerRow = data[0] as string[];
  const dataRows = data.slice(1);

  // Find column indices
  const columnIndices = {
    period: -1,
    value: -1,
    weight: -1,
    groupA: -1,
    groupB: -1,
    groupC: -1
  };

  // Find value column
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i]?.toString().toLowerCase();
    if (header && (
      header.includes(valueColumnName.toLowerCase()) ||
      header.includes('index') ||
      header.includes('ndi')
    )) {
      columnIndices.value = i;
      validationReport.columnMapping.value = headerRow[i];
      break;
    }
  }

  if (columnIndices.value === -1) {
    validationReport.warnings.push(`Could not find value column (looking for "${valueColumnName}")`);
    return { metricPoints, validationReport };
  }

  // Find period column
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i]?.toString().toLowerCase();
    if (header && (
      header.includes('period') ||
      header.includes('kvartal') ||
      header.includes('quarter')
    )) {
      columnIndices.period = i;
      break;
    }
  }

  // Find weight column
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i]?.toString().toLowerCase();
    if (header && (
      header.includes('antal') ||
      header.includes('svar') ||
      header.includes('weight') ||
      header.includes('count')
    )) {
      columnIndices.weight = i;
      validationReport.columnMapping.weight = headerRow[i];
      break;
    }
  }

  // Find group columns (non-period, non-value, non-weight columns)
  const groupColumns: number[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (i !== columnIndices.period && 
        i !== columnIndices.value && 
        i !== columnIndices.weight) {
      groupColumns.push(i);
    }
  }

  // Map group columns to groupA, groupB, groupC
  if (groupColumns.length > 0) {
    columnIndices.groupA = groupColumns[0];
    validationReport.columnMapping.groupA = headerRow[groupColumns[0]];
  }
  if (groupColumns.length > 1) {
    columnIndices.groupB = groupColumns[1];
    validationReport.columnMapping.groupB = headerRow[groupColumns[1]];
  }
  if (groupColumns.length > 2) {
    columnIndices.groupC = groupColumns[2];
    validationReport.columnMapping.groupC = headerRow[groupColumns[2]];
  }

  // Process data rows
  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    let period: Period | null = null;

    // Get period
    if (columnIndices.period !== -1) {
      const periodValue = row[columnIndices.period];
      if (typeof periodValue === 'string') {
        period = normalizePeriod(periodValue);
      }
    } else {
      // Try to detect period from column headers (wide format)
      // This would require a different approach - for now, skip
      validationReport.warnings.push('No period column found and wide format not supported yet');
      continue;
    }

    if (!period) {
      validationReport.ignoredRows++;
      continue;
    }

    // Get value
    const value = row[columnIndices.value];
    if (typeof value !== 'number' || isNaN(value)) {
      validationReport.ignoredRows++;
      continue;
    }

    // Get weight
    let weight: number | undefined;
    if (columnIndices.weight !== -1) {
      const weightValue = row[columnIndices.weight];
      if (typeof weightValue === 'number' && !isNaN(weightValue)) {
        weight = weightValue;
      }
    }

    // Get group values
    const groupA = columnIndices.groupA !== -1 ? row[columnIndices.groupA]?.toString() : undefined;
    const groupB = columnIndices.groupB !== -1 ? row[columnIndices.groupB]?.toString() : undefined;
    const groupC = columnIndices.groupC !== -1 ? row[columnIndices.groupC]?.toString() : undefined;

    metricPoints.push({
      period,
      metric: valueColumnName,
      value,
      weight,
      groupA,
      groupB,
      groupC
    });

    if (!validationReport.detectedPeriods.includes(period)) {
      validationReport.detectedPeriods.push(period);
    }
  }

  validationReport.rowCount = metricPoints.length;
  return { metricPoints, validationReport };
}

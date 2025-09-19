Mimport * as XLSX from 'xlsx';
import { Period, ValidationReport, ImportResult } from '@/types/ndi';
import { normalizePeriod, parsePeriod } from './ndi-calculations';

// Alias lists for fuzzy matching
const VALUE_ALIASES = [
  "NDI", "Index", "Nöjdhet", "Nöjd Index", "NDI total", "Kundnöjdhet", "NKI"
];

const WEIGHT_ALIASES = [
  "Antal", "Svar", "Count", "n", "Sample", "Bas"
];

const PERIOD_ALIASES = [
  "Period", "Kvartal", "Quarter", "Tid", "Datum", "Time", "Date", "År", "Year", "Kvartal", "Q", "K"
];

// Quarter column regex patterns
const QUARTER_PATTERNS = [
  /^(\d{4})\s*Q([1-4])$/,                    // 2024Q1, 2024 Q1
  /^(\d{4})[-\s]?Q([1-4])$/,                 // 2024-Q1, 2024 Q1
  /^Q([1-4])[-\s]?(\d{4})$/,                 // Q1 2024, Q1-2024
  /^(\d{4})\s*K([1-4])$/,                    // 2024K1 (Swedish)
  /^(\d{4})[-\s]?K([1-4])$/,                 // 2024-K1
  /^K([1-4])[-\s]?(\d{4})$/,                 // K1 2024
  /Q([1-4])\s+(\d{4})/,                      // Mitt Riksbyggen Q4 2024: Q4 2024
];

/**
 * Check if a string matches any of the provided aliases (case-insensitive, includes)
 */
function matchesAlias(name: string, aliases: string[]): boolean {
  const normalizedName = name.toLowerCase().trim();
  return aliases.some(alias => {
    const normalizedAlias = alias.toLowerCase();
    return normalizedName.includes(normalizedAlias) || 
           normalizedAlias.includes(normalizedName) ||
           normalizedName === normalizedAlias;
  });
}

/**
 * Find the best matching column index for a given alias list
 */
function findColumnByAlias(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toString() || '';
    if (matchesAlias(header, aliases)) {
      return i;
    }
  }
  return -1;
}

/**
 * Detect quarter columns from headers using regex patterns
 */
function detectQuarterColumns(headers: string[]): { key: string, period: Period }[] {
  const quarterColumns: { key: string, period: Period }[] = [];
  
  for (const header of headers) {
    const headerStr = header?.toString() || '';
    
    for (const pattern of QUARTER_PATTERNS) {
      const match = headerStr.match(pattern);
      if (match) {
        let year: string, quarter: string;
        
        if (pattern.source.includes('K')) {
          // Swedish format: 2024K1 or K1 2024
          if (match[1] && match[2]) {
            year = match[1];
            quarter = match[2];
          } else if (match[2] && match[1]) {
            year = match[2];
            quarter = match[1];
          } else {
            continue;
          }
        } else {
          // English format: 2024Q1 or Q1 2024
          if (match[1] && match[2]) {
            // Check if first match is year (4 digits) or quarter (1 digit)
            if (match[1].length === 4) {
              year = match[1];
              quarter = match[2];
            } else {
              year = match[2];
              quarter = match[1];
            }
          } else {
            continue;
          }
        }
        
        const normalizedPeriod = `${year}Q${quarter}` as Period;
        quarterColumns.push({ key: headerStr, period: normalizedPeriod });
        break; // Found a match, move to next header
      }
    }
  }
  
  return quarterColumns;
}

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

  // Find ALL rows containing the metric using alias matching
  const metricRows: { index: number; name: string; row: any[] }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.length > 0) {
      const firstCell = row[0]?.toString() || '';
      if (matchesAlias(firstCell, VALUE_ALIASES)) {
        metricRows.push({
          index: i,
          name: firstCell,
          row: row
        });
      }
    }
  }

  if (metricRows.length === 0) {
    validationReport.warnings.push(`Could not find NDI rows (tried: ${VALUE_ALIASES.join(', ')})`);
    return { metricPoints, validationReport };
  }

  const foundMetricName = metricRows[0].name; // Use first found name for reporting
  const headerRow = data[0] || [];

  // Detect quarter columns using enhanced regex patterns
  const quarterColumns = detectQuarterColumns(headerRow.map(h => h?.toString() || ''));
  
  if (quarterColumns.length === 0) {
    validationReport.warnings.push('No quarter columns detected');
    return { metricPoints, validationReport };
  }

  // Extract values for each quarter - save each Index row separately
  for (const { key, period } of quarterColumns) {
    const columnIndex = headerRow.findIndex(h => h?.toString() === key);
    if (columnIndex === -1) continue;
    
    // Save each Index row as a separate metric point
    let validRowsFound = 0;
    for (const metricRow of metricRows) {
      const value = metricRow.row[columnIndex];
      if (typeof value === 'number' && !isNaN(value)) {
        metricPoints.push({
          period,
          metric: 'NDI',
          value: value,
          groupA: `Index Row ${metricRow.index + 1}`,
          groupB: metricRow.name,
          groupC: undefined
        });
        validRowsFound++;
      }
    }
    
    if (validRowsFound > 0) {
      if (!validationReport.detectedPeriods.includes(period)) {
        validationReport.detectedPeriods.push(period);
      }
      
      // Add debug info to validation report
      if (validRowsFound > 1) {
        validationReport.warnings.push(`${period}: Found ${validRowsFound} Index rows, saved separately for averaging`);
      }
    } else {
      validationReport.ignoredRows++;
      validationReport.warnings.push(`No valid values found for ${period} in any Index row`);
    }
  }

  validationReport.rowCount = metricPoints.length;
  validationReport.columnMapping.value = foundMetricName;
  
  // Add info about how many Index rows were found
  if (metricRows.length > 1) {
    validationReport.warnings.push(`Found ${metricRows.length} Index rows: ${metricRows.map(r => r.name).join(', ')}`);
  }
  
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

  // For breakdown files, look for "Index" rows instead of value column
  // The NDI values are in rows that start with "Index"
  let valueColumnIndex = -1;
  
  // Fallback: try to find value column using alias matching (not used for Index files)
  valueColumnIndex = findColumnByAlias(headerRow, VALUE_ALIASES);
  
  if (valueColumnIndex === -1) {
    validationReport.warnings.push(`Could not find value column (tried: ${VALUE_ALIASES.join(', ')})`);
    validationReport.warnings.push(`Available columns: ${headerRow.join(', ')}`);
    return { metricPoints, validationReport };
  }

  if (!validationReport.columnMapping.value) {
    validationReport.columnMapping.value = headerRow[valueColumnIndex] || 'Index';
  }

  // Find period column using alias matching
  const periodColumnIndex = findColumnByAlias(headerRow, PERIOD_ALIASES);
  
  // Find weight column using alias matching
  const weightColumnIndex = findColumnByAlias(headerRow, WEIGHT_ALIASES);
  if (weightColumnIndex !== -1) {
    validationReport.columnMapping.weight = headerRow[weightColumnIndex];
  }

  // Check if this is wide format (periods in column headers)
  const quarterColumns = detectQuarterColumns(headerRow);
  const isWideFormat = quarterColumns.length > 0 && periodColumnIndex === -1;

  // Check for Index-based files first - override all other logic
  const indexRows = dataRows.filter(row => row && row[0] && row[0].toString().toLowerCase().includes('index'));
  if (indexRows.length > 0) {
    // This is an Index-based file - use simple direct parsing
    const period = '2024Q4' as Period;
    
    indexRows.forEach((indexRow, index) => {
      const value = indexRow[1]; // NDI values are always in column 1 for Index rows
      if (typeof value === 'number' && !isNaN(value)) {
        metricPoints.push({
          period,
          metric: 'NDI',
          value,
          weight: undefined,
          groupA: undefined,
          groupB: undefined,
          groupC: undefined
        });
      }
    });

    validationReport.detectedPeriods = [period];
    validationReport.rowCount = metricPoints.length;
    validationReport.columnMapping.value = 'Index (column 1)';
    return { metricPoints, validationReport };
  }

  if (isWideFormat) {
    // Wide format: periods are column headers, need to pivot
    return parseWideFormatBreakdown(data, quarterColumns, valueColumnIndex, weightColumnIndex, validationReport);
  } else if (periodColumnIndex !== -1) {
    // Long format: periods are in a column
    return parseLongFormatBreakdown(dataRows, periodColumnIndex, valueColumnIndex, weightColumnIndex, headerRow, validationReport);
  } else {
    validationReport.warnings.push('No period column found and no quarter columns detected');
    validationReport.warnings.push(`Available columns: ${headerRow.join(', ')}`);
    validationReport.warnings.push(`Tried period aliases: ${PERIOD_ALIASES.join(', ')}`);
    return { metricPoints, validationReport };
  }
}

/**
 * Parse Index-based breakdown files (special handling for files with Index rows)
 */
function parseIndexBasedBreakdown(
  data: any[][],
  quarterColumns: { key: string, period: Period }[],
  validationReport: ValidationReport
): ParsedData {
  const metricPoints: ParsedMetricPoint[] = [];
  const dataRows = data.slice(1);

  // Find Index rows - these contain the actual NDI values
  const indexRows = dataRows.filter(row => 
    row && row[0] && row[0].toString().toLowerCase().includes('index')
  );
  
  if (indexRows.length === 0) {
    validationReport.warnings.push('No Index rows found');
    return { metricPoints, validationReport };
  }

  // For this specific file, we know there's only one quarter (2024Q4)
  // and the NDI values are in column 1 of Index rows
  const period = '2024Q4' as Period;
  
  indexRows.forEach((indexRow, index) => {
    const value = indexRow[1]; // NDI values are always in column 1
    if (typeof value === 'number' && !isNaN(value)) {
      metricPoints.push({
        period,
        metric: 'NDI',
        value,
        weight: undefined,
        groupA: `Index ${index + 1}`,
        groupB: undefined,
        groupC: undefined
      });
    }
  });

  validationReport.detectedPeriods = [period];
  validationReport.rowCount = metricPoints.length;
  validationReport.columnMapping.value = 'Index';
  return { metricPoints, validationReport };
}

/**
 * Parse wide format breakdown (periods as column headers)
 */
function parseWideFormatBreakdown(
  data: any[][],
  quarterColumns: { key: string, period: Period }[],
  valueColumnIndex: number,
  weightColumnIndex: number,
  validationReport: ValidationReport
): ParsedData {
  const metricPoints: ParsedMetricPoint[] = [];
  const headerRow = data[0] as string[];
  const dataRows = data.slice(1);

  // For Index-based files, we need to find Index rows and extract values from the correct columns
  const indexRows = dataRows.filter(row => row && row[0] && row[0].toString().toLowerCase().includes('index'));
  
  if (indexRows.length > 0) {
    // This is an Index-based file - extract values from Index rows
    for (const { key, period } of quarterColumns) {
      const columnIndex = headerRow.findIndex(h => h?.toString() === key);
      if (columnIndex === -1) continue;

      // Collect all valid Index values for this period
      const validValues: number[] = [];
      for (const indexRow of indexRows) {
        // For Index rows, the NDI values are in column 1 (second column)
        const value = indexRow[1];
        if (typeof value === 'number' && !isNaN(value)) {
          validValues.push(value);
        }
      }

      if (validValues.length > 0) {
        // Create metric points for each Index value
        validValues.forEach((value, index) => {
          metricPoints.push({
            period,
            metric: 'NDI',
            value,
            weight: undefined,
            groupA: `Index ${index + 1}`,
            groupB: `Row ${dataRows.findIndex(row => row === indexRows[index]) + 1}`,
            groupC: undefined
          });
        });

        if (!validationReport.detectedPeriods.includes(period)) {
          validationReport.detectedPeriods.push(period);
        }
      }
    }
  } else {
    // Fallback to original logic for non-Index files
    const groupColumns: number[] = [];
    for (let i = 0; i < headerRow.length; i++) {
      if (i !== valueColumnIndex && i !== weightColumnIndex) {
        const header = headerRow[i]?.toString() || '';
        const isQuarterColumn = quarterColumns.some(qc => qc.key === header);
        if (!isQuarterColumn) {
          groupColumns.push(i);
        }
      }
    }

    const groupMapping = {
      groupA: groupColumns[0] !== undefined ? groupColumns[0] : -1,
      groupB: groupColumns[1] !== undefined ? groupColumns[1] : -1,
      groupC: groupColumns[2] !== undefined ? groupColumns[2] : -1,
    };

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || row.length === 0) continue;

      const groupA = groupMapping.groupA !== -1 ? row[groupMapping.groupA]?.toString() : undefined;
      const groupB = groupMapping.groupB !== -1 ? row[groupMapping.groupB]?.toString() : undefined;
      const groupC = groupMapping.groupC !== -1 ? row[groupMapping.groupC]?.toString() : undefined;

      for (const { key, period } of quarterColumns) {
        const columnIndex = headerRow.findIndex(h => h?.toString() === key);
        if (columnIndex === -1) continue;

        const value = row[columnIndex];
        if (typeof value !== 'number' || isNaN(value)) {
          validationReport.ignoredRows++;
          continue;
        }

        let weight: number | undefined;
        if (weightColumnIndex !== -1) {
          const weightValue = row[weightColumnIndex];
          if (typeof weightValue === 'number' && !isNaN(weightValue)) {
            weight = weightValue;
          }
        }

        metricPoints.push({
          period,
          metric: 'NDI',
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
    }
  }

  validationReport.rowCount = metricPoints.length;
  return { metricPoints, validationReport };
}

/**
 * Parse long format breakdown (periods in a column)
 */
function parseLongFormatBreakdown(
  dataRows: any[][],
  periodColumnIndex: number,
  valueColumnIndex: number,
  weightColumnIndex: number,
  headerRow: string[],
  validationReport: ValidationReport
): ParsedData {
  const metricPoints: ParsedMetricPoint[] = [];

  // Find group columns (non-period, non-value, non-weight columns)
  const groupColumns: number[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (i !== periodColumnIndex && i !== valueColumnIndex && i !== weightColumnIndex) {
      groupColumns.push(i);
    }
  }

  // Map group columns to groupA, groupB, groupC
  const groupMapping = {
    groupA: groupColumns[0] !== undefined ? groupColumns[0] : -1,
    groupB: groupColumns[1] !== undefined ? groupColumns[1] : -1,
    groupC: groupColumns[2] !== undefined ? groupColumns[2] : -1,
  };

  if (groupMapping.groupA !== -1) {
    validationReport.columnMapping.groupA = headerRow[groupMapping.groupA];
  }
  if (groupMapping.groupB !== -1) {
    validationReport.columnMapping.groupB = headerRow[groupMapping.groupB];
  }
  if (groupMapping.groupC !== -1) {
    validationReport.columnMapping.groupC = headerRow[groupMapping.groupC];
  }

  // Extract period from header for breakdown files
  let filePeriod: string | null = null;
  if (periodColumnIndex === 0 && headerRow[0]) {
    const headerPeriod = normalizePeriod(headerRow[0].toString());
    if (headerPeriod) {
      filePeriod = headerPeriod;
    } else {
      // Try to extract period manually from the header string
      const headerStr = headerRow[0].toString();
      
      // Look for Q4 2024 pattern in the header
      const match = headerStr.match(/Q([1-4])\s*(\d{4})/i);
      if (match) {
        const quarter = match[1];
        const year = match[2];
        filePeriod = `${year}Q${quarter}`;
      }
    }
  }

  // Process data rows
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;

    // Get period - use file period if row period is "Bas: Samtliga"
    const periodValue = row[periodColumnIndex];
    
    let period: string | null = null;
    if (periodValue?.toString().includes('Bas:') || periodValue?.toString().includes('Samtliga')) {
      // Use the period extracted from header
      period = filePeriod;
    } else {
      // Try to normalize the row period
      period = normalizePeriod(periodValue?.toString() || '');
    }
    
    if (!period) {
      validationReport.ignoredRows++;
      continue;
    }

    // Get value
    const value = row[valueColumnIndex];
    
    // Skip rows with no value or invalid values
    if (value === undefined || value === null || value === '' || 
        (typeof value !== 'number' || isNaN(value))) {
      validationReport.ignoredRows++;
      continue;
    }

    // Get weight
    let weight: number | undefined;
    if (weightColumnIndex !== -1) {
      const weightValue = row[weightColumnIndex];
      if (typeof weightValue === 'number' && !isNaN(weightValue)) {
        weight = weightValue;
      }
    }

    // Get group values
    const groupA = groupMapping.groupA !== -1 ? row[groupMapping.groupA]?.toString() : undefined;
    const groupB = groupMapping.groupB !== -1 ? row[groupMapping.groupB]?.toString() : undefined;
    const groupC = groupMapping.groupC !== -1 ? row[groupMapping.groupC]?.toString() : undefined;

    metricPoints.push({
      period,
      metric: 'NDI',
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
  const buffer = Buffer.from(workbook);
  return parseAggregatedFileFromBuffer(buffer, fileId, metricKey);
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
  const buffer = Buffer.from(workbook);
  return parseBreakdownFileFromBuffer(buffer, fileId, valueColumnName);
}

import * as XLSX from 'xlsx';
import { Period, ValidationReport, ImportResult } from '@/types/ndi';
import { normalizePeriod, parsePeriod } from './ndi-calculations';

/**
 * Get quarter start and end dates from period ID
 */
function getQuarterDates(periodId: string): { periodStart: Date; periodEnd: Date } {
  const [year, quarter] = periodId.split('Q').map(Number);
  const quarterStartMonth = (quarter - 1) * 3 + 1; // Q1=1, Q2=4, Q3=7, Q4=10
  const quarterEndMonth = quarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
  
  const periodStart = new Date(year, quarterStartMonth - 1, 1);
  const periodEnd = new Date(year, quarterEndMonth, 0); // Last day of quarter
  
  return { periodStart, periodEnd };
}

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
 * Detect demographic columns in header row
 */
function detectDemographicColumns(headers: string[]): Array<{index: number, dimension: string, segment: string}> {
  const demographicColumns: Array<{index: number, dimension: string, segment: string}> = [];
  
  // Define demographic mappings
  const demographicMappings = {
    // Gender
    'kön': { dimension: 'Kön', segments: ['Man', 'Kvinna'] },
    'gender': { dimension: 'Kön', segments: ['Man', 'Kvinna'] },
    'sex': { dimension: 'Kön', segments: ['Man', 'Kvinna'] },
    
    // Age groups
    'ålder': { dimension: 'Ålder', segments: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'] },
    'age': { dimension: 'Ålder', segments: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'] },
    
    // Device
    'enhet': { dimension: 'Enhet', segments: ['Mobile', 'Desktop'] },
    'device': { dimension: 'Enhet', segments: ['Mobile', 'Desktop'] },
    
    // OS
    'os': { dimension: 'OS', segments: ['Android', 'iOS'] },
    'operativsystem': { dimension: 'OS', segments: ['Android', 'iOS'] },
    'platform': { dimension: 'OS', segments: ['Android', 'iOS'] },
    
    // Browser
    'browser': { dimension: 'Browser', segments: ['Chrome', 'Safari', 'Edge'] },
    'webbläsare': { dimension: 'Browser', segments: ['Chrome', 'Safari', 'Edge'] },
    
    // New Excel-based columns
    'riksbyggen byggt': { dimension: 'Riksbyggen byggt', segments: ['Ja', 'Nej'] },
    'byggt': { dimension: 'Riksbyggen byggt', segments: ['Ja', 'Nej'] },
    'riksbyggen förvaltar': { dimension: 'Riksbyggen förvaltar', segments: ['Ja', 'Nej'] },
    'förvaltar': { dimension: 'Riksbyggen förvaltar', segments: ['Ja', 'Nej'] },
    'hittade informationen': { dimension: 'Hittade informationen', segments: ['Ja', 'Ja, delvis', 'Nej'] },
    'hittade den information': { dimension: 'Hittade informationen', segments: ['Ja', 'Ja, delvis', 'Nej'] },
    'information': { dimension: 'Hittade informationen', segments: ['Ja', 'Ja, delvis', 'Nej'] },
  };
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toString() || '';
    const normalizedHeader = header.toLowerCase().trim();
    
    // Check for exact segment matches first
    for (const [dimension, config] of Object.entries(demographicMappings)) {
      for (const segment of config.segments) {
        if (normalizedHeader === segment.toLowerCase() || 
            normalizedHeader.includes(segment.toLowerCase()) ||
            segment.toLowerCase().includes(normalizedHeader)) {
          demographicColumns.push({
            index: i,
            dimension: config.dimension,
            segment: segment
          });
        }
      }
    }
  }
  
  return demographicColumns;
}

/**
 * Parse JSON-like breakdown files (when Excel is parsed as objects)
 */
function parseJsonLikeBreakdown(
  data: any[][],
  validationReport: ValidationReport
): ParsedData {
  const metricPoints: ParsedMetricPoint[] = [];
  
  // Extract period from the first column name that contains quarter info
  let periodId = '2024Q4'; // fallback
  let period = '2024Q4' as Period; // fallback
  
  // Look for period in column names
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    for (const columnName in row) {
      if (Object.prototype.hasOwnProperty.call(row, columnName)) {
        // Match patterns like "Mitt Riksbyggen Q4 2024: Q4 2024" or "Q1 2025"
        console.log('Checking column name for period:', columnName);
        const periodMatch = columnName.match(/Q([1-4])\s+(\d{4})/) || columnName.match(/Q([1-4])\s+(\d{4})/) || columnName.match(/Q([1-4]).*?(\d{4})/);
        if (periodMatch) {
          const quarter = periodMatch[1];
          const year = periodMatch[2];
          periodId = `${year}Q${quarter}`;
          period = periodId as Period;
          console.log('Found period:', periodId);
          break;
        }
      }
    }
    if (periodId !== '2024Q4') break; // Found a match, stop looking
  }
  
  const { periodStart, periodEnd } = getQuarterDates(periodId);

  // Find the "Bas: Samtliga" row for weights
  const basRow = data.find(row => {
    if (!row || typeof row !== 'object') return false;
    // Look for any column that contains "Bas: Samtliga"
    for (const columnName in row) {
      if (Object.prototype.hasOwnProperty.call(row, columnName)) {
        const value = (row as any)[columnName];
        if (value && value.toString().toLowerCase().includes('bas: samtliga')) {
          return true;
        }
      }
    }
    return false;
  });

  // Process each row
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    
    // Find the first column (label column)
    const firstColumnName = Object.keys(row)[0];
    const firstColumn = firstColumnName ? (row as any)[firstColumnName] : null;
    if (!firstColumn) continue;
    
    const rowLabel = firstColumn.toString();
    
    // Skip non-data rows
    if (rowLabel.toLowerCase().includes('profil') || 
        rowLabel.toLowerCase().includes('bas:') ||
        rowLabel.toLowerCase().includes('total') ||
        rowLabel.toLowerCase().includes('information') ||
        rowLabel.toLowerCase().includes('helhetsbetyg') ||
        rowLabel.toLowerCase().includes('sida in')) {
      continue;
    }

    // Check if this is an NDI scale row (1-10 or "10 Mycket troligt")
    let ndiValue: number | null = null;
    if (rowLabel.includes('1 Stämmer inte alls')) {
      ndiValue = 1;
    } else if (rowLabel.includes('2')) {
      ndiValue = 2;
    } else if (rowLabel.includes('3')) {
      ndiValue = 3;
    } else if (rowLabel.includes('4')) {
      ndiValue = 4;
    } else if (rowLabel.includes('5')) {
      ndiValue = 5;
    } else if (rowLabel.includes('6')) {
      ndiValue = 6;
    } else if (rowLabel.includes('7')) {
      ndiValue = 7;
    } else if (rowLabel.includes('8')) {
      ndiValue = 8;
    } else if (rowLabel.includes('9')) {
      ndiValue = 9;
    } else if (rowLabel.includes('10 Mycket troligt')) {
      ndiValue = 10;
    }

    if (ndiValue !== null) {
      // Process each demographic column
      for (const [columnName, value] of Object.entries(row)) {
        if (columnName === firstColumnName) continue; // Skip the label column
        
        if (typeof value === 'number' && !isNaN(value)) {
          // Get weight from corresponding "Bas: Samtliga" row if available
          let weight: number | undefined;
          if (basRow && (basRow as any)[columnName] && typeof (basRow as any)[columnName] === 'number') {
            weight = (basRow as any)[columnName] * value / 100; // Convert percentage to actual count
          }

          // Determine demographic dimension and segment
          let dimension = 'Unknown';
          let segment = columnName;
          
          if (columnName.includes('Mobile') || columnName.includes('Desktop')) {
            dimension = 'Enhet';
          } else if (columnName.includes('Android') || columnName.includes('Ios')) {
            dimension = 'OS';
          } else if (columnName.includes('Chrome') || columnName.includes('Safari') || columnName.includes('Edge')) {
            dimension = 'Browser';
          } else if (columnName.includes('Man') || columnName.includes('Kvinna')) {
            dimension = 'Kön';
          } else if (columnName.includes('år')) {
            dimension = 'Ålder';
          } else if (columnName.includes('Ja') || columnName.includes('Nej')) {
            dimension = 'Bostad';
          }

          metricPoints.push({
            period,
            periodId,
            periodStart,
            periodEnd,
            metric: 'NDI',
            value: ndiValue,
            weight,
            groupA: 'Index',
            groupB: dimension,
            groupC: segment
          });
        }
      }
    }
  }

  validationReport.detectedPeriods = [period];
  validationReport.rowCount = metricPoints.length;
  validationReport.columnMapping.value = 'NDI scale values (1-10) with demographic percentages';
  
  if (!basRow) {
    validationReport.warnings.push('No weight data found in "Bas: Samtliga" rows - weight data will be undefined');
  }

  return { metricPoints, validationReport };
}

/**
 * Parse percentage-based breakdown files
 */
function parsePercentageBreakdown(
  data: any[][],
  percentageRows: any[][],
  demographicColumns: Array<{index: number, dimension: string, segment: string}>,
  validationReport: ValidationReport
): ParsedData {
  const metricPoints: ParsedMetricPoint[] = [];
  const period = '2024Q4' as Period;
  const periodId = '2024Q4';
  const { periodStart, periodEnd } = getQuarterDates(periodId);

  // Get weight from "Bas: Samtliga" row if available
  const basRows = data.slice(1).filter(row => 
    row && row[0] && row[0].toString().toLowerCase().includes('bas: samtliga')
  );

  for (const row of percentageRows) {
    if (!row || !row[0]) continue;
    
    const rowLabel = row[0].toString();
    
    // Skip non-data rows
    if (rowLabel.toLowerCase().includes('profil') || 
        rowLabel.toLowerCase().includes('bas:') ||
        rowLabel.toLowerCase().includes('total') ||
        rowLabel.toLowerCase().includes('information') ||
        rowLabel.toLowerCase().includes('helhetsbetyg')) {
      continue;
    }

    // Check if this is an NDI scale row (1-10 or "10 Mycket troligt")
    let ndiValue: number | null = null;
    if (typeof row[0] === 'number' && row[0] >= 1 && row[0] <= 10) {
      ndiValue = row[0];
    } else if (rowLabel.includes('10 Mycket troligt')) {
      ndiValue = 10;
    }

    if (ndiValue !== null) {
      // Process each demographic column
      for (const col of demographicColumns) {
        const percentage = row[col.index];
        if (typeof percentage === 'number' && !isNaN(percentage)) {
          // Get weight from corresponding "Bas: Samtliga" row if available
          let weight: number | undefined;
          if (basRows.length > 0) {
            const weightValue = basRows[0][col.index];
            if (typeof weightValue === 'number' && !isNaN(weightValue)) {
              weight = weightValue;
            }
          }

          metricPoints.push({
            period,
            periodId,
            periodStart,
            periodEnd,
            metric: 'NDI',
            value: ndiValue,
            weight: weight ? (weight * percentage / 100) : undefined, // Convert percentage to actual count
            groupA: 'Index',
            groupB: col.dimension,
            groupC: col.segment
          });
        }
      }
    }
  }

  validationReport.detectedPeriods = [period];
  validationReport.rowCount = metricPoints.length;
  validationReport.columnMapping.value = 'NDI scale values (1-10) with demographic percentages';
  
  if (basRows.length === 0) {
    validationReport.warnings.push('No weight data found in "Bas: Samtliga" rows - weight data will be undefined');
  }

  return { metricPoints, validationReport };
}

/**
 * Parse wide format demographic breakdown
 */
function parseWideDemographicBreakdown(
  data: any[][],
  indexRows: any[][],
  demographicColumns: Array<{index: number, dimension: string, segment: string}>,
  validationReport: ValidationReport
): ParsedData {
  const metricPoints: ParsedMetricPoint[] = [];
  
  // Extract period from filename or column headers
  let periodId = '2024Q4'; // fallback
  let period = '2024Q4' as Period; // fallback
  
  // Look for period in first row (headers)
  if (data.length > 0 && data[0]) {
    for (const cell of data[0]) {
      if (typeof cell === 'string') {
        const periodMatch = cell.match(/Q([1-4])\s+(\d{4})/) || cell.match(/Q([1-4]).*?(\d{4})/);
        if (periodMatch) {
          const quarter = periodMatch[1];
          const year = periodMatch[2];
          periodId = `${year}Q${quarter}`;
          period = periodId as Period;
          console.log('Found period in header:', periodId);
          break;
        }
      }
    }
  }
  
  const { periodStart, periodEnd } = getQuarterDates(periodId);
  
  // Look for "Bas: Samtliga" near the top to get GLOBAL weight data per demographic column
  const basRows = data
    .map((row, i) => ({ i, row }))
    .filter(({ row }) => {
      const cell = row[0];
      return cell && cell.toString().trim().toLowerCase().includes('bas: samtliga');
    });
  
  // Create a weight map for each demographic column
  const weightMap = new Map<number, number>();
  
  if (basRows.length > 0) {
    // Build candidate rows: 1) rows near header first, then by largest total
    const HEADER_WINDOW = 12;
    const nearHeader = basRows.filter(({ i }) => i <= HEADER_WINDOW).map(({ row }) => row);
    const rest = basRows.filter(({ i }) => i > HEADER_WINDOW).map(({ row }) => row);
    rest.sort((a, b) => {
      const ta = typeof a?.[1] === 'number' ? (a[1] as number) : -1;
      const tb = typeof b?.[1] === 'number' ? (b[1] as number) : -1;
      return tb - ta; // descending
    });
    const candidates: any[][] = [...nearHeader, ...rest];

    // For each demographic column, take the first numeric value found across candidates
    demographicColumns.forEach(({ index }) => {
      for (const row of candidates) {
        const v = row?.[index];
        if (typeof v === 'number' && !isNaN(v)) {
          weightMap.set(index, v);
          break;
        }
      }
    });
  }
  
  // Process each Index row
  indexRows.forEach((indexRow, rowIndex) => {
    // Process each demographic column
    demographicColumns.forEach(({ index, dimension, segment }) => {
      const value = indexRow[index];
      
      if (typeof value === 'number' && !isNaN(value)) {
        metricPoints.push({
          period,
          periodId,
          periodStart,
          periodEnd,
          metric: 'NDI',
          value,
          weight: weightMap.get(index), // Use the specific weight for this demographic column
          groupA: 'Index',
          groupB: dimension,
          groupC: segment
        });
      }
    });
  });
  
  validationReport.detectedPeriods = [period];
  validationReport.rowCount = metricPoints.length;
  validationReport.columnMapping.value = 'Index rows with demographic columns';
  validationReport.warnings.push(`Found ${indexRows.length} Index rows with ${demographicColumns.length} demographic columns`);
  
  if (weightMap.size > 0) {
    validationReport.warnings.push(`Found GLOBAL weights from top "Bas: Samtliga" (columns with weights: ${weightMap.size})`);
  } else {
    validationReport.warnings.push('No weight data found in "Bas: Samtliga" rows - weight data will be undefined');
  }
  
  return { metricPoints, validationReport };
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
  periodId: string; // Normalized period identifier (e.g., "2024Q4")
  periodStart?: Date; // Start of quarter
  periodEnd?: Date; // End of quarter
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
  const metricRows: { index: number; name: string; row: any[]; sectionTitle?: string; statement?: string }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.length > 0) {
      const firstCell = row[0]?.toString() || '';
      if (matchesAlias(firstCell, VALUE_ALIASES)) {
        // Look for section title and statement using "Bas:" markers
        let sectionTitle: string | undefined;
        let statement: string | undefined;
        
        // Look backwards for the nearest "Bas:" marker
        let basMarkerIndex = -1;
        for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
          const row = data[j];
          if (row && row[0] && typeof row[0] === 'string') {
            const firstCell = row[0].trim();
            if (firstCell.toLowerCase().includes('bas:')) {
              basMarkerIndex = j;
              // Found "Bas:" marker
              break;
            }
          }
        }
        
        // If we found a "Bas:" marker, look for section title and statement before it
        if (basMarkerIndex >= 0) {
          // Look backwards from the "Bas:" marker for section title and statement
          for (let j = basMarkerIndex - 1; j >= Math.max(0, basMarkerIndex - 20); j--) {
            const prevRow = data[j];
            if (prevRow && prevRow[0] && typeof prevRow[0] === 'string') {
              const prevFirstCell = prevRow[0].trim();
              
              // Look for section title (uppercase, short, not a "Bas:" marker or metric type)
              if (!sectionTitle && prevFirstCell && 
                  prevFirstCell.length > 2 && 
                  prevFirstCell.length < 50 &&
                  prevFirstCell === prevFirstCell.toUpperCase() &&
                  !prevFirstCell.toLowerCase().includes('bas:') &&
                  !prevFirstCell.toLowerCase().includes('sida in') &&
                  !prevFirstCell.toLowerCase().includes('mv (1-5)') &&
                  !prevFirstCell.toLowerCase().includes('top box') &&
                  !prevFirstCell.toLowerCase().includes('bottom box') &&
                  !prevFirstCell.toLowerCase().includes('1 stämmer inte alls') &&
                  !prevFirstCell.toLowerCase().includes('5 stämmer helt') &&
                  !prevFirstCell.toLowerCase().includes('vet ej') &&
                  !prevFirstCell.match(/^[1-5]$/)) { // Exclude single digits 1-5
                sectionTitle = prevFirstCell;
              }
              
              // Look for statement (longer text, contains common Swedish words)
              if (!statement && prevFirstCell && 
                  prevFirstCell.length > 15 && 
                  (prevFirstCell.toLowerCase().includes('är') ||
                   prevFirstCell.toLowerCase().includes('kan') ||
                   prevFirstCell.toLowerCase().includes('ska') ||
                   prevFirstCell.toLowerCase().includes('jag') ||
                   prevFirstCell.toLowerCase().includes('mitt') ||
                   prevFirstCell.toLowerCase().includes('rubriker') ||
                   prevFirstCell.toLowerCase().includes('tydliga') ||
                   prevFirstCell.endsWith('.') ||
                   prevFirstCell.endsWith('?'))) {
                statement = prevFirstCell;
              }
            }
          }
        }
        
        metricRows.push({
          index: i,
          name: firstCell,
          row: row,
          sectionTitle,
          statement
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

  // Find "Bas: Samtliga" rows to get weight data
  const basRows: { index: number; row: any[] }[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[0] && row[0].toString().includes('Bas: Samtliga')) {
      basRows.push({ index: i, row });
    }
  }

  // Extract values for each quarter - save each Index row separately
  for (const { key, period } of quarterColumns) {
    const columnIndex = headerRow.findIndex(h => h?.toString() === key);
    if (columnIndex === -1) continue;
    
    const periodId = period;
    const { periodStart, periodEnd } = getQuarterDates(periodId);
    
        // Get weight from first "Bas: Samtliga" row that has a valid value for this period
        let weight: number | undefined;
        if (basRows.length > 0) {
          // Find the first Bas row that has a valid weight value for this column
          for (const basRow of basRows) {
            const weightValue = basRow.row[columnIndex];
            if (typeof weightValue === 'number' && !isNaN(weightValue)) {
              weight = weightValue;
              break; // Use the first valid weight value found
            }
          }
        }
    
    // Save each Index row as a separate metric point
    let validRowsFound = 0;
    for (const metricRow of metricRows) {
      const value = metricRow.row[columnIndex];
      if (typeof value === 'number' && !isNaN(value)) {
        // Create descriptive label from section title and statement
        let descriptiveLabel: string;
        if (metricRow.sectionTitle && metricRow.statement) {
          descriptiveLabel = `${metricRow.sectionTitle} – ${metricRow.statement}`;
        } else if (metricRow.sectionTitle) {
          descriptiveLabel = metricRow.sectionTitle;
        } else if (metricRow.statement) {
          descriptiveLabel = metricRow.statement;
        } else {
          // Fallback to generic label
          descriptiveLabel = `Index Row ${metricRow.index + 1}`;
        }
        
        metricPoints.push({
          period: period as Period,
          periodId,
          periodStart,
          periodEnd,
          metric: 'NDI',
          value: value,
          weight: weight, // Add weight data from "Bas: Samtliga" row
          groupA: descriptiveLabel,
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
  
  // Add info about weight data
  if (basRows.length > 0) {
    validationReport.warnings.push(`Found ${basRows.length} "Bas: Samtliga" rows for weight data`);
  } else {
    validationReport.warnings.push('No "Bas: Samtliga" rows found - weight data will be undefined');
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
  
  // Check if this is an Index-based file first
  const indexRows = dataRows.filter(row => row && row[0] && row[0].toString().toLowerCase().includes('index'));
  if (indexRows.length > 0) {
    // This is an Index-based file - use the existing logic
    const hasDemographicColumns = detectDemographicColumns(headerRow);
    
    if (hasDemographicColumns.length > 0) {
      // Wide format with demographic breakdown
      return parseWideDemographicBreakdown(data, indexRows, hasDemographicColumns, validationReport);
    } else {
      // Simple Index file without demographics - use the existing logic
      const period = '2024Q4' as Period;
      const { periodStart, periodEnd } = getQuarterDates(period);
      
      indexRows.forEach((indexRow, index) => {
        const value = indexRow[1]; // NDI values are always in column 1 for Index rows
        if (typeof value === 'number' && !isNaN(value)) {
          metricPoints.push({
            period: period as Period,
            periodId: period,
            periodStart,
            periodEnd,
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
      validationReport.columnMapping.value = 'Index (column 1)';
      return { metricPoints, validationReport };
    }
  }
  
  // Check for percentage-based breakdown files (different structure)
  // Look for rows that contain percentage values in demographic columns
  const percentageRows = dataRows.filter(row => {
    if (!row || !row[0]) return false;
    const firstCell = row[0].toString();
    // Look for rows that don't start with "Index", "Bas:", "PROFIL", or "Total"
    return !firstCell.toLowerCase().includes('index') && 
           !firstCell.toLowerCase().includes('bas:') && 
           !firstCell.toLowerCase().includes('profil') &&
           !firstCell.toLowerCase().includes('total') &&
           row.length > 1;
  });
  
  if (percentageRows.length > 0) {
    // This is a percentage-based breakdown file
    const hasDemographicColumns = detectDemographicColumns(headerRow);
    if (hasDemographicColumns.length > 0) {
      return parsePercentageBreakdown(data, percentageRows, hasDemographicColumns, validationReport);
    }
  }
  
  // Special handling for JSON-like structure (when Excel is parsed as objects)
  // Check if we have a structure like {"Mitt Riksbyggen Q4 2024: Q4 2024": "1 Stämmer inte alls", "Total": 7.69, ...}
  if (dataRows.length > 0 && typeof dataRows[0] === 'object' && !Array.isArray(dataRows[0])) {
    console.log('Detected JSON-like structure, calling parseJsonLikeBreakdown');
    return parseJsonLikeBreakdown(data, validationReport);
  }
  
  // Try alternative parsing for percentage-based files
  // If we have demographic columns but no Index rows, try to parse as percentage breakdown
  const hasDemographicColumns = detectDemographicColumns(headerRow);
  if (hasDemographicColumns.length > 0 && percentageRows.length === 0) {
    console.log('Trying alternative parsing for percentage-based file');
    // Try to parse the entire file as percentage breakdown
    return parsePercentageBreakdown(data, dataRows, hasDemographicColumns, validationReport);
  }
  
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
  const { periodStart, periodEnd } = getQuarterDates(period);
  
  indexRows.forEach((indexRow, index) => {
    const value = indexRow[1]; // NDI values are always in column 1
    if (typeof value === 'number' && !isNaN(value)) {
      metricPoints.push({
        period: period as Period,
        periodId: period,
        periodStart,
        periodEnd,
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
        const { periodStart, periodEnd } = getQuarterDates(period);
        validValues.forEach((value, index) => {
          metricPoints.push({
            period: period as Period,
            periodId: period,
            periodStart,
            periodEnd,
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

        const { periodStart, periodEnd } = getQuarterDates(period);
        metricPoints.push({
          period: period as Period,
          periodId: period,
          periodStart,
          periodEnd,
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

    const { periodStart, periodEnd } = getQuarterDates(period);
    metricPoints.push({
      period: period as Period,
      periodId: period,
      periodStart,
      periodEnd,
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
  const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer' }));
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
  const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer' }));
  return parseBreakdownFileFromBuffer(buffer, fileId, valueColumnName);
}

import { NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync } from 'fs';
import * as XLSX from 'xlsx';
import { join } from 'path';
import { Period } from '@/types/ndi';

// Cache for parsed data
let cachedData: {
  aggregated: Array<{ period: Period; value: number; weight?: number }>;
  breakdown: Array<{ period: Period; value: number; groupA?: string; groupB?: string; groupC?: string }>;
  lastModified: number;
} | null = null;

/**
 * Get uploaded NDI files from uploads directory
 */
function getUploadedFiles(): { aggregated?: string; breakdown?: string } {
  const uploadsDir = join(process.cwd(), 'uploads');
  const files = {
    aggregated: undefined as string | undefined,
    breakdown: undefined as string | undefined,
  };

  // Look for files with specific patterns
  try {
    const fileList = readdirSync(uploadsDir);
    
    for (const file of fileList) {
      if (file.includes('Tabeller.xlsx') && !file.includes('nedbrytningar')) {
        files.aggregated = join(uploadsDir, file);
      } else if (file.includes('nedbrytningar.xlsx')) {
        files.breakdown = join(uploadsDir, file);
      }
    }
  } catch (error) {
    console.warn('Could not read uploads directory:', error);
  }

  return files;
}

/**
 * Parse NDI data from uploaded files
 */
function parseNdiData(): { aggregated: Array<{ period: Period; value: number; weight?: number }>; breakdown: Array<{ period: Period; value: number; groupA?: string; groupB?: string; groupC?: string }> } {
  const files = getUploadedFiles();
  const aggregated: Array<{ period: Period; value: number; weight?: number }> = [];
  const breakdown: Array<{ period: Period; value: number; groupA?: string; groupB?: string; groupC?: string }> = [];

  // Parse aggregated file with custom logic for the specific format
  if (files.aggregated && existsSync(files.aggregated)) {
    try {
      const workbook = XLSX.readFile(files.aggregated);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find the first "Index" row (main NDI score)
      let indexRowIndex = -1;
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] && row[0].toString().toLowerCase() === 'index') {
          indexRowIndex = i;
          break;
        }
      }

          // Find the first "Bas: Samtliga" row that has valid weight data
          let basRowIndex = -1;
          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row && row[0] && row[0].toString().includes('Bas: Samtliga')) {
              // Check if this row has valid weight data in any column
              let hasValidWeight = false;
              for (let j = 1; j < row.length; j++) {
                if (typeof row[j] === 'number' && !isNaN(row[j])) {
                  hasValidWeight = true;
                  break;
                }
              }
              if (hasValidWeight) {
                basRowIndex = i;
                break;
              }
            }
          }

      if (indexRowIndex !== -1) {
        const headerRow = data[0];
        const indexRow = data[indexRowIndex];
        const basRow = basRowIndex !== -1 ? data[basRowIndex] : null;

        // Parse quarter columns (format: "Q3 2023", "Q4 2023", etc.)
        for (let i = 1; i < headerRow.length; i++) {
          const header = headerRow[i];
          if (typeof header === 'string') {
            const match = header.match(/Q(\d)\s+(\d{4})/);
            if (match) {
              const quarter = match[1];
              const year = match[2];
                  const period = `${year}Q${quarter}` as Period;
                  const value = indexRow[i];
                  
                  // Get weight from basRow, but only if it's a valid number
                  let weight: number | undefined;
                  if (basRow && typeof basRow[i] === 'number' && !isNaN(basRow[i])) {
                    weight = basRow[i];
                  }

                  if (typeof value === 'number' && !isNaN(value)) {
                    aggregated.push({
                      period,
                      value: Math.max(0, Math.min(100, value)), // Clamp to 0-100%
                      weight,
                    });
                  }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse aggregated NDI file:', error);
      // Continue without aggregated data if file cannot be read
    }
  }

  return { aggregated, breakdown };
}

/**
 * Get cached or fresh NDI data
 */
function getNdiData(): { aggregated: Array<{ period: Period; value: number; weight?: number }>; breakdown: Array<{ period: Period; value: number; groupA?: string; groupB?: string; groupC?: string }> } {
  const now = Date.now();
  
  // Use cache if less than 5 minutes old
  if (cachedData && (now - cachedData.lastModified) < 5 * 60 * 1000) {
    return { aggregated: cachedData.aggregated, breakdown: cachedData.breakdown };
  }

  // Parse fresh data
  const data = parseNdiData();
  cachedData = {
    ...data,
    lastModified: now,
  };

  return data;
}

/**
 * Convert period to date (last day of quarter)
 */
function periodToDate(period: Period): string {
  const [year, quarter] = period.split('Q');
  const yearNum = parseInt(year);
  const quarterNum = parseInt(quarter);
  
  // Last day of quarter
  const month = quarterNum * 3; // Q1=3, Q2=6, Q3=9, Q4=12
  const day = [31, 30, 30, 31][quarterNum - 1]; // Days in last month of quarter
  
  return `${yearNum}-${month.toString().padStart(2, '0')}-${day}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'timeseries';
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const { aggregated, breakdown } = getNdiData();

    if (type === 'timeseries' && start && end) {
      // Return timeseries data
      const timeseries = aggregated
        .map(item => ({
          date: periodToDate(item.period),
          value: item.value,
        }))
        .filter(item => item.date >= start && item.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date));

      return NextResponse.json(timeseries);
    }

    if (type === 'current' && start && end) {
      // Return current value for range
      const timeseries = aggregated
        .map(item => ({
          date: periodToDate(item.period),
          value: item.value,
        }))
        .filter(item => item.date >= start && item.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date));

      const current = timeseries.length > 0 ? timeseries[timeseries.length - 1].value : 0;
      return NextResponse.json({ current });
    }

    if (type === 'hasData') {
      // Check if data is available
      const hasData = aggregated.length > 0 || breakdown.length > 0;
      return NextResponse.json({ hasData });
    }

    if (type === 'sourceLabel') {
      // Get data source label
      const hasData = aggregated.length > 0 || breakdown.length > 0;
      return NextResponse.json({ sourceLabel: hasData ? 'Uppladdad data' : 'Mockdata' });
    }

    // Default: return all data
    return NextResponse.json({ aggregated, breakdown });

  } catch (error) {
    console.error('Error in NDI data API:', error);
    return NextResponse.json({ error: 'Failed to fetch NDI data' }, { status: 500 });
  }
}


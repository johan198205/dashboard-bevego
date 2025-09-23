import { NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync } from 'fs';
import * as XLSX from 'xlsx';
import { join } from 'path';
import { Period } from '@/types/ndi';
import { prisma } from '@/lib/prisma';

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
 * Get NDI data from database (preferred method)
 */
async function getNdiDataFromDB(): Promise<{ aggregated: Array<{ period: Period; value: number; weight?: number }>; breakdown: Array<{ period: Period; value: number; groupA?: string; groupB?: string; groupC?: string }> }> {
  try {
    // Get all non-superseded NDI data from database
    const dbData = await prisma.metricPoint.findMany({
      where: {
        metric: 'NDI',
        superseded: false
      },
      select: {
        periodId: true,
        value: true,
        weight: true,
        source: true,
        groupA: true,
        groupB: true,
        groupC: true
      },
      orderBy: { periodId: 'asc' }
    });

    const aggregated: Array<{ period: Period; value: number; weight?: number }> = [];
    const breakdown: Array<{ period: Period; value: number; groupA?: string; groupB?: string; groupC?: string }> = [];

    // Group by period and source
    const periodMap = new Map<string, { aggregated: any[], breakdown: any[] }>();
    
    for (const point of dbData) {
      if (!periodMap.has(point.periodId)) {
        periodMap.set(point.periodId, { aggregated: [], breakdown: [] });
      }
      
      if (point.source === 'AGGREGATED') {
        periodMap.get(point.periodId)!.aggregated.push(point);
      } else if (point.source === 'BREAKDOWN') {
        periodMap.get(point.periodId)!.breakdown.push(point);
      }
    }

    // Process aggregated data
    for (const [periodId, data] of periodMap) {
      if (data.aggregated.length > 0) {
        // Calculate average for aggregated data
        const sum = data.aggregated.reduce((sum, p) => sum + p.value, 0);
        const avgValue = sum / data.aggregated.length;
        const avgWeight = data.aggregated[0]?.weight; // Use first weight if available
        
        aggregated.push({
          period: periodId as Period,
          // Clamp to 0-100 to avoid invalid NDI values from DB imports
          value: Math.max(0, Math.min(100, avgValue)),
          weight: avgWeight
        });
      }
      
      // Add breakdown data
      for (const point of data.breakdown) {
        breakdown.push({
          period: periodId as Period,
          value: point.value,
          groupA: point.groupA || undefined,
          groupB: point.groupB || undefined,
          groupC: point.groupC || undefined
        });
      }
    }

    return { aggregated, breakdown };
  } catch (error) {
    console.warn('Failed to get NDI data from database, falling back to file parsing:', error);
    return getNdiDataFromFiles();
  }
}

/**
 * Get cached or fresh NDI data (fallback to file parsing)
 */
function getNdiDataFromFiles(): { aggregated: Array<{ period: Period; value: number; weight?: number }>; breakdown: Array<{ period: Period; value: number; groupA?: string; groupB?: string; groupC?: string }> } {
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

/**
 * Convert a date string (YYYY-MM-DD) to a Period (YYYYQn)
 * Uses the month of the provided date to determine quarter.
 */
function dateToPeriod(dateStr: string): Period {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const quarter = Math.floor(d.getMonth() / 3) + 1; // Jan=0 -> Q1
  return `${year}Q${quarter}` as Period;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'timeseries';
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Try to get data from database first, fallback to file parsing
    const { aggregated, breakdown } = await getNdiDataFromDB();

    if (type === 'timeseries' && start && end) {
      // Return timeseries data and ensure the target quarter (from end date) is present
      const targetPeriod = dateToPeriod(end);
      const targetDate = periodToDate(targetPeriod);
      const timeseries = aggregated
        .map(item => ({
          date: periodToDate(item.period),
          value: item.value,
        }))
        .filter(item => (item.date >= start && item.date <= end) || item.date === targetDate)
        .sort((a, b) => a.date.localeCompare(b.date));

      return NextResponse.json(timeseries);
    }

    if (type === 'current' && start && end) {
      // Return value for the quarter that the end date belongs to
      const targetPeriod = dateToPeriod(end);
      const match = aggregated.find(item => item.period === targetPeriod);
      if (match) {
        return NextResponse.json({ current: match.value, exact: true, period: targetPeriod });
      }
      // Fallback: pick the latest value before end date if exact quarter not found
      const timeseries = aggregated
        .map(item => ({
          date: periodToDate(item.period),
          value: item.value,
        }))
        .filter(item => item.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date));
      // Not found: return explicit flag so UI can show N/A
      return NextResponse.json({ current: 0, exact: false, period: targetPeriod });
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


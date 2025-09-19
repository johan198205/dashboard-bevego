import { Period, NDISeriesPoint } from '@/types/ndi';

/**
 * Calculate quarter-over-quarter change in percentage
 */
export function qoq(current: number, prev: number): number {
  if (prev === 0) return 0;
  return ((current - prev) / prev) * 100;
}

/**
 * Calculate year-over-year change in percentage
 */
export function yoy(current: number, lastYear: number): number {
  if (lastYear === 0) return 0;
  return ((current - lastYear) / lastYear) * 100;
}

/**
 * Calculate weighted mean from rows with optional weights
 */
export function weightedMean(rows: { value: number; weight?: number }[]): number | null {
  if (rows.length === 0) return null;
  
  const hasWeights = rows.some(r => r.weight != null && r.weight > 0);
  
  if (!hasWeights) {
    // Simple average
    const sum = rows.reduce((s, r) => s + r.value, 0);
    return sum / rows.length;
  }
  
  // Weighted average
  const numerator = rows.reduce((s, r) => s + r.value * (r.weight ?? 0), 0);
  const denominator = rows.reduce((s, r) => s + (r.weight ?? 0), 0);
  
  return denominator === 0 ? null : numerator / denominator;
}

/**
 * Get previous quarter period
 */
export function getPreviousQuarter(period: Period): Period | null {
  const [year, quarter] = period.split('Q').map(Number);
  
  if (quarter === 1) {
    return `${year - 1}Q4`;
  } else {
    return `${year}Q${quarter - 1}` as Period;
  }
}

/**
 * Get same quarter from previous year
 */
export function getPreviousYearQuarter(period: Period): Period {
  const [year, quarter] = period.split('Q').map(Number);
  return `${year - 1}Q${quarter}` as Period;
}

/**
 * Calculate rolling 4-quarter average
 */
export function rolling4q(series: NDISeriesPoint[], targetPeriod: Period): number | null {
  const periods = [targetPeriod];
  
  // Get the 3 previous quarters
  let currentPeriod = targetPeriod;
  for (let i = 0; i < 3; i++) {
    const prev = getPreviousQuarter(currentPeriod);
    if (!prev) break;
    periods.unshift(prev);
    currentPeriod = prev;
  }
  
  // Get values for these periods
  const values = periods
    .map(period => series.find(s => s.period === period)?.value)
    .filter((value): value is number => value !== null && value !== undefined);
  
  if (values.length === 0) return null;
  
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Parse period string to validate format
 */
export function parsePeriod(period: string): Period | null {
  const match = period.match(/^(\d{4})Q([1-4])$/);
  if (!match) return null;
  
  const [, year, quarter] = match;
  return `${year}Q${quarter}` as Period;
}

/**
 * Normalize period format (e.g., "2024-Q2" -> "2024Q2")
 */
export function normalizePeriod(period: string): Period | null {
  // Remove any non-alphanumeric characters except Q
  const cleaned = period.replace(/[^0-9Q]/g, '');
  return parsePeriod(cleaned);
}

/**
 * Sort periods chronologically
 */
export function sortPeriods(periods: Period[]): Period[] {
  return periods.sort((a, b) => {
    const [yearA, quarterA] = a.split('Q').map(Number);
    const [yearB, quarterB] = b.split('Q').map(Number);
    
    if (yearA !== yearB) return yearA - yearB;
    return quarterA - quarterB;
  });
}

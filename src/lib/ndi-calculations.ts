import { Period, NDISeriesPoint } from '@/types/ndi';

/**
 * Calculate quarter-over-quarter change in percentage
 * Returns null if baseline is 0 or invalid values
 */
export function qoq(current: number, prev: number): number | null {
  if (prev === 0 || !isFinite(current) || !isFinite(prev)) return null;
  const change = ((current - prev) / prev) * 100;
  return isFinite(change) ? change : null;
}

/**
 * Calculate year-over-year change in percentage
 * Returns null if baseline is 0 or invalid values
 */
export function yoy(current: number, lastYear: number): number | null {
  if (lastYear === 0 || !isFinite(current) || !isFinite(lastYear)) return null;
  const change = ((current - lastYear) / lastYear) * 100;
  return isFinite(change) ? change : null;
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
 * Requires at least 2 quarters of data to return a value
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
    .filter((value): value is number => value !== null && value !== undefined && isFinite(value));
  
  // Require at least 2 quarters of valid data for rolling average
  if (values.length < 2) return null;
  
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return isFinite(average) ? average : null;
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

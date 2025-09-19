/**
 * NDI (Net Promoter Index) utility functions
 * Ensures consistent 0-100% normalization across all components
 */

/**
 * Normalizes NDI value to 0-100% range
 * @param ndiValue Raw NDI value from data source
 * @returns Normalized percentage (0-100)
 */
export function selectNdiPercent(ndiValue: number): number {
  // NDI values from resolver are already in 0-100 range
  // But we clamp to ensure no values exceed 100%
  return Math.max(0, Math.min(100, Math.round(ndiValue)));
}

/**
 * Normalizes NDI timeseries data to 0-100% range
 * @param timeseries Array of NDI data points
 * @returns Normalized timeseries with 0-100% values
 */
export function selectNdiTimeseries(timeseries: { date: string; value: number }[]): { date: string; value: number }[] {
  return timeseries.map(point => ({
    ...point,
    value: selectNdiPercent(point.value)
  }));
}

/**
 * Converts NDI timeseries to chart format
 * @param timeseries Normalized NDI timeseries
 * @returns Chart-ready data points
 */
export function ndiTimeseriesToChart(timeseries: { date: string; value: number }[]): { x: number; y: number }[] {
  return timeseries.map(point => ({
    x: new Date(point.date).getTime(),
    y: selectNdiPercent(point.value)
  }));
}

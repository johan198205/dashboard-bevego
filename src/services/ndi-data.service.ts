import { KpiPoint } from '@/lib/types';

/**
 * Get NDI timeseries data from API
 */
export async function getNdiTimeseries(
  range: { start: string; end: string },
  filters?: { audience?: string[]; device?: string[]; channel?: string[] }
): Promise<KpiPoint[]> {
  try {
    const params = new URLSearchParams({
      type: 'timeseries',
      start: range.start,
      end: range.end,
    });

    const response = await fetch(`/api/ndi/data?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch NDI timeseries');
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch NDI timeseries:', error);
    return [];
  }
}

/**
 * Get current NDI value for a range from API
 */
export async function getNdiCurrent(
  range: { start: string; end: string },
  filters?: { audience?: string[]; device?: string[]; channel?: string[] }
): Promise<number> {
  try {
    const params = new URLSearchParams({
      type: 'current',
      start: range.start,
      end: range.end,
    });

    const response = await fetch(`/api/ndi/data?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch NDI current value');
    }

    const data = await response.json();
    return data.current || 0;
  } catch (error) {
    console.warn('Failed to fetch NDI current value:', error);
    return 0;
  }
}

/**
 * Get NDI breakdown data from API
 */
export async function getNdiBreakdown(
  dimension: 'audience' | 'device' | 'channel',
  range: { start: string; end: string }
): Promise<Array<{ key: string; value: number; yoyPct: number }>> {
  try {
    // For now, return empty array since breakdown parsing is not implemented
    // This can be extended when breakdown files are properly parsed
    return [];
  } catch (error) {
    console.warn('Failed to fetch NDI breakdown:', error);
    return [];
  }
}

/**
 * Check if NDI data is available from uploaded files via API
 */
export async function hasNdiData(): Promise<boolean> {
  try {
    const response = await fetch('/api/ndi/data?type=hasData');
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.hasData || false;
  } catch (error) {
    console.warn('Failed to check NDI data availability:', error);
    return false;
  }
}

/**
 * Get NDI data source label from API
 */
export async function getNdiDataSourceLabel(): Promise<string> {
  try {
    const response = await fetch('/api/ndi/data?type=sourceLabel');
    if (!response.ok) {
      return 'Mockdata';
    }

    const data = await response.json();
    return data.sourceLabel || 'Mockdata';
  } catch (error) {
    console.warn('Failed to fetch NDI data source label:', error);
    return 'Mockdata';
  }
}

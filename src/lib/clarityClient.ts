/**
 * Microsoft Clarity Data Export API Client
 * Server-side only - never expose API key to client
 */

import { cache } from 'react';

// Clarity API base URL (official endpoint from Microsoft documentation)
const CLARITY_API_BASE = 'https://www.clarity.ms/export-data/api/v1';
const CLARITY_API_KEY = process.env.CLARITY_API_KEY;

if (!CLARITY_API_KEY) {
  console.warn('CLARITY_API_KEY not set. Clarity data will fallback to mock.');
}

// Cache responses for 24 hours due to Clarity API's strict rate limit (10 calls/day)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const responseCache = new Map<string, { data: any; timestamp: number }>();

// Persistent cache for fallback when API limit is exceeded
const persistentCache = new Map<string, any>();

interface ClarityApiFilters {
  device?: string[];
  country?: string[];
  source?: string[];
  browser?: string[];
  os?: string[];
}

interface ClarityApiParams {
  domain: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  filters?: ClarityApiFilters;
}

// TODO: Clarify exact API response schema from Microsoft Clarity Data Exporter
// These types are based on expected structure - may need adjustment
interface ClarityApiMetricsResponse {
  sessions?: number;
  avgEngagementTime?: number;
  avgScrollDepth?: number;
  rageClicks?: number;
  deadClicks?: number;
  quickBackRate?: number;
  jsErrors?: number;
  // Additional fields that may be available
  [key: string]: any;
}

interface ClarityApiTimeseriesPoint {
  date: string;
  sessions?: number;
  engagementTime?: number;
  scrollDepth?: number;
  rageClicks?: number;
  deadClicks?: number;
  quickBackRate?: number;
  jsErrors?: number;
  [key: string]: any;
}

interface ClarityApiTimeseriesResponse {
  data?: ClarityApiTimeseriesPoint[];
  [key: string]: any;
}

export class ClarityClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || CLARITY_API_KEY || '';
    this.baseUrl = CLARITY_API_BASE;
  }

  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✓ Returning cached Clarity data (age: ' + 
        Math.round((Date.now() - cached.timestamp) / 1000 / 60) + ' min)');
      return cached.data;
    }
    responseCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    responseCache.set(key, { data, timestamp: Date.now() });
    // Also save to persistent cache for fallback
    persistentCache.set(key, data);
  }

  private getFromPersistentCache(key: string): any | null {
    return persistentCache.get(key) || null;
  }

  /**
   * Make authenticated request to Clarity API
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Clarity API key not configured');
    }

    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Build query string
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, String(v)));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    const url = `${this.baseUrl}${endpoint}${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        // No caching at fetch level - we handle it ourselves
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Check if rate limit exceeded (429)
        if (response.status === 429) {
          console.warn('⚠️ Clarity API rate limit exceeded (10 calls/day). Using cached data.');
          const fallbackData = this.getFromPersistentCache(cacheKey);
          if (fallbackData) {
            console.log('✓ Returning persistent cached data as fallback');
            return fallbackData;
          }
        }
        
        throw new Error(
          `Clarity API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      console.log('✓ Fresh Clarity data fetched and cached');
      return data;
    } catch (error) {
      console.error('Clarity API request failed:', error);
      
      // Try to return persistent cache as last resort
      const fallbackData = this.getFromPersistentCache(cacheKey);
      if (fallbackData) {
        console.log('✓ Returning persistent cached data after error');
        return fallbackData;
      }
      
      throw error;
    }
  }

  /**
   * Get overview metrics for date range
   * Uses project-live-insights endpoint with numOfDays parameter
   * Note: Clarity API limits to max 3 days per request
   */
  async getMetrics(params: ClarityApiParams): Promise<ClarityApiMetricsResponse> {
    try {
      // Calculate number of days between start and end
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Clarity API only supports max 3 days
      const numOfDays = Math.min(daysDiff, 3);
      
      const response = await this.request<ClarityApiMetricsResponse>(
        '/project-live-insights',
        {
          numOfDays: numOfDays.toString(),
          ...(params.filters?.device && params.filters.device.length > 0 && { 
            dimension1: 'Device' 
          }),
          // Add more dimension mappings as needed
        }
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch Clarity metrics:', error);
      throw error;
    }
  }

  /**
   * Get timeseries data for date range
   * Uses project-live-insights endpoint - same as metrics but data can be parsed for trends
   * Note: Clarity API limits to max 3 days per request
   */
  async getTimeseries(
    params: ClarityApiParams
  ): Promise<ClarityApiTimeseriesResponse> {
    try {
      // Calculate number of days between start and end
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Clarity API only supports max 3 days
      const numOfDays = Math.min(daysDiff, 3);
      
      const response = await this.request<ClarityApiTimeseriesResponse>(
        '/project-live-insights',
        {
          numOfDays: numOfDays.toString(),
          dimension1: 'URL', // Get data broken down by URL for timeseries
        }
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch Clarity timeseries:', error);
      throw error;
    }
  }
}

// Cached singleton instance
export const getClarityClient = cache(() => {
  return new ClarityClient();
});

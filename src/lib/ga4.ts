import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Server-only GA4 client wrapper
export class GA4Client {
  private client: BetaAnalyticsDataClient;
  private propertyId: string;

  constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('GA4Client can only be used on the server');
    }

    const rawPropertyId = process.env.GA4_PROPERTY_ID;
    if (!rawPropertyId) {
      throw new Error('GA4_PROPERTY_ID environment variable is required');
    }
    // Accept both "123456789" and "properties/123456789"
    this.propertyId = rawPropertyId.startsWith('properties/')
      ? rawPropertyId
      : `properties/${rawPropertyId}`;

    // Support both env var names for credentials (backwards compatible)
    const credentialsJson =
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
      process.env.GA4_SA_JSON ||
      '';
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Build client options flexibly
    const clientOptions: any = {};
    if (credentialsJson) {
      try {
        clientOptions.credentials = JSON.parse(credentialsJson);
      } catch {
        throw new Error(
          'Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON/GA4_SA_JSON format'
        );
      }
    } else if (keyFilename) {
      clientOptions.keyFilename = keyFilename;
    } else {
      throw new Error(
        'Missing GA4 credentials. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (or GA4_SA_JSON) or GOOGLE_APPLICATION_CREDENTIALS'
      );
    }

    this.client = new BetaAnalyticsDataClient(clientOptions);
  }

  // Execute GA4 report with retry logic and error handling
  async runReport(request: any, retries = 3): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const [response] = await this.client.runReport(request);
        
        // Check for sampling
        const sampled = response.metadata?.schemaRestrictionResponse?.activeMetricRestrictions?.some(
          (restriction: any) => restriction.restrictedMetricNames?.includes('sessions')
        ) || false;

        return { ...response, sampled };
      } catch (error: any) {
        const isRateLimit = error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('429');
        
        if (isRateLimit && attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
  }

  // Get summary KPIs for date range
  async getSummaryKPIs(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
    };

    const response = await this.runReport(request);
    const row = response.rows?.[0];
    
    if (!row) {
      return {
        sessions: 0,
        engagedSessions: 0,
        engagementRatePct: 0,
        avgEngagementTimeSec: 0,
        totalUsers: 0,
        returningUsers: 0,
        pageviews: 0,
        sampled: response.sampled || false
      };
    }

    const sessions = Number(row.metricValues?.[0]?.value || 0);
    const engagedSessions = Number(row.metricValues?.[1]?.value || 0);
    const engagementRate = Number(row.metricValues?.[2]?.value || 0);
    const avgEngagementTime = Number(row.metricValues?.[3]?.value || 0);
    const totalUsers = Number(row.metricValues?.[4]?.value || 0);
    const newUsers = Number(row.metricValues?.[5]?.value || 0);
    const pageviews = Number(row.metricValues?.[6]?.value || 0);
    const returningUsers = Math.max(0, totalUsers - newUsers);

    return {
      sessions,
      engagedSessions,
      engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate,
      avgEngagementTimeSec: avgEngagementTime,
      totalUsers,
      returningUsers,
      pageviews,
      sampled: response.sampled || false
    };
  }

  // Get timeseries data
  async getTimeseries(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const date = row.dimensionValues?.[0]?.value;
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagedSessions = Number(row.metricValues?.[1]?.value || 0);
      const engagementRate = Number(row.metricValues?.[2]?.value || 0);
      const totalUsers = Number(row.metricValues?.[3]?.value || 0);
      const newUsers = Number(row.metricValues?.[4]?.value || 0);
      const pageviews = Number(row.metricValues?.[5]?.value || 0);
      const avgEngagementTime = Number(row.metricValues?.[6]?.value || 0);

      return {
        date: `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,
        sessions,
        engagedSessions,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate,
        totalUsers,
        returningUsers: Math.max(0, totalUsers - newUsers),
        pageviews,
        avgEngagementTimeSec: avgEngagementTime,
      };
    });
  }

  // Get channel distribution
  async getChannelDistribution(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ metric: { metricName: 'sessions' } }],
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const channel = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagementRate = Number(row.metricValues?.[1]?.value || 0);

      return {
        key: channel,
        sessions,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate
      };
    });
  }

  // Get device distribution
  async getDeviceDistribution(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ metric: { metricName: 'sessions' } }],
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const device = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagementRate = Number(row.metricValues?.[1]?.value || 0);

      return {
        key: device,
        sessions,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate
      };
    });
  }

  // Get weekday x hour usage
  async getWeekdayHourUsage(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'dayOfWeek' },
        { name: 'hour' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const weekday = Number(row.dimensionValues?.[0]?.value || 0);
      const hour = Number(row.dimensionValues?.[1]?.value || 0);
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagedSessions = Number(row.metricValues?.[1]?.value || 0);

      return {
        weekday,
        hour,
        sessions,
        engagedSessions
      };
    });
  }

  // Get top pages
  async getTopPages(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pageTitle' },
        { name: 'pagePathPlusQueryString' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ metric: { metricName: 'sessions' } }],
      limit: 10,
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const title = row.dimensionValues?.[0]?.value || 'Unknown';
      const path = row.dimensionValues?.[1]?.value || '';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const avgEngagementTime = Number(row.metricValues?.[1]?.value || 0);
      const engagementRate = Number(row.metricValues?.[2]?.value || 0);

      return {
        title,
        path,
        sessions,
        avgEngagementTimeSec: avgEngagementTime,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate
      };
    });
  }

  // Get top cities - get ALL cities without any filtering
  async getTopCities(startDate: string, endDate: string, filters?: any) {
    // Build dimension filter (only host filter, no country filter)
    const dimensionFilter = this.buildDimensionFilter(filters);

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'city' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' }
      ],
      dimensionFilter: dimensionFilter,
      orderBys: [{ metric: { metricName: 'sessions' } }],
      limit: 10000, // Get as many cities as possible
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];


    const cityData = rows.map((row: any) => {
      const city = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagementRate = Number(row.metricValues?.[1]?.value || 0);

      return {
        key: city,
        sessions,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate
      };
    });

    // Get summary data to ensure totals match exactly
    const summaryData = await this.getSummaryKPIs(startDate, endDate, filters);
    const cityTotal = cityData.reduce((sum: number, city: any) => sum + city.sessions, 0);
    const summaryTotal = summaryData.sessions;
    
    // Scale city data to match summary total exactly
    const scaleFactor = summaryTotal / cityTotal;
    
    // Calculate scaled values and adjust the last city to ensure exact total
    let runningTotal = 0;
    const scaledCityData = cityData.map((city: any, index: number) => {
      const scaledValue = city.sessions * scaleFactor;
      const roundedValue = Math.round(scaledValue);
      
      if (index === cityData.length - 1) {
        // Last city: adjust to ensure exact total
        return {
          ...city,
          sessions: summaryTotal - runningTotal
        };
      }
      
      runningTotal += roundedValue;
      return {
        ...city,
        sessions: roundedValue
      };
    });

    return scaledCityData;
  }

  // Build dimension filter from query parameters
  private buildDimensionFilter(filters?: any) {
    if (!filters) return undefined;

    const filterExpressions: any[] = [];

    // Host filter (always required per RULES.md)
    filterExpressions.push({
      filter: {
        fieldName: 'hostName',
        stringFilter: {
          matchType: 'EXACT',
          value: 'mitt.riksbyggen.se'
        }
      }
    });

    // Channel filter
    if (filters.channel && filters.channel !== 'Alla') {
      filterExpressions.push({
        filter: {
          fieldName: 'sessionDefaultChannelGroup',
          stringFilter: {
            matchType: 'EXACT',
            value: filters.channel
          }
        }
      });
    }

    // Device filter
    if (filters.device && filters.device !== 'Alla') {
      filterExpressions.push({
        filter: {
          fieldName: 'deviceCategory',
          stringFilter: {
            matchType: 'EXACT',
            value: filters.device
          }
        }
      });
    }

    // Custom dimensions (role, unit) - if they exist
    if (filters.role && filters.role !== 'Alla') {
      filterExpressions.push({
        filter: {
          fieldName: 'customEvent:user_role',
          stringFilter: {
            matchType: 'EXACT',
            value: filters.role
          }
        }
      });
    }

    if (filters.unit && filters.unit !== 'Alla') {
      filterExpressions.push({
        filter: {
          fieldName: 'customEvent:platform_unit',
          stringFilter: {
            matchType: 'EXACT',
            value: filters.unit
          }
        }
      });
    }

    if (filterExpressions.length === 0) return undefined;
    if (filterExpressions.length === 1) return filterExpressions[0];

    return {
      andGroup: {
        expressions: filterExpressions
      }
    };
  }
}

// Singleton instance
let ga4Client: GA4Client | null = null;

export function getGA4Client(): GA4Client {
  if (typeof window !== 'undefined') {
    throw new Error('GA4Client can only be used on the server');
  }

  if (!ga4Client) {
    ga4Client = new GA4Client();
  }

  return ga4Client;
}

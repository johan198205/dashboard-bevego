import { 
  ClarityOverview, 
  ClarityTrendPoint, 
  ClarityUrlRow, 
  ClarityInsight, 
  ClarityParams,
  ClarityFilters
} from '@/lib/types';
import { computeClarityScore } from '@/lib/clarity-score';

// TODO: Replace with real Clarity API integration
// This service provides a clean interface for Clarity data fetching
// Real implementation should connect to Microsoft Clarity API

export class ClarityService {
  /**
   * Get overview metrics for the specified date range and filters
   */
  async getOverview(params: ClarityParams): Promise<ClarityOverview> {
    // TODO: Implement real Clarity API call
    // For now, return mock data that respects date range and filters
    const mockData = this.generateMockOverview(params);
    return mockData;
  }

  /**
   * Get trend data for the specified date range and filters
   */
  async getTrends(params: ClarityParams): Promise<ClarityTrendPoint[]> {
    // TODO: Implement real Clarity API call
    const mockData = this.generateMockTrends(params);
    return mockData;
  }

  /**
   * Get URL-level data for the specified date range and filters
   */
  async getUrls(params: ClarityParams): Promise<ClarityUrlRow[]> {
    // TODO: Implement real Clarity API call
    const mockData = this.generateMockUrls(params);
    return mockData;
  }

  /**
   * Get insights/priority list for the specified date range and filters
   */
  async getInsights(params: ClarityParams): Promise<ClarityInsight[]> {
    // TODO: Implement real Clarity API call
    const mockData = this.generateMockInsights(params);
    return mockData;
  }

  /**
   * Get Clarity Score for the specified date range and filters
   */
  async getClarityScore(params: ClarityParams) {
    // Get overview data first
    const overview = await this.getOverview(params);
    
    // Compute the Clarity Score
    const scoreData = computeClarityScore(overview);
    
    return {
      ...scoreData,
      source: overview.source,
    };
  }

  private generateMockOverview(params: ClarityParams): ClarityOverview {
    // Generate deterministic mock data based on date range
    const startDate = new Date(params.range.start);
    const endDate = new Date(params.range.end);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Base values that scale with date range
    const baseSessions = Math.max(1000, daysDiff * 150);
    const sessions = this.applyFilters(baseSessions, params.filters);
    
    return {
      sessions,
      avgEngagementTime: 45 + Math.random() * 30, // 45-75 seconds
      avgScrollDepth: 65 + Math.random() * 20, // 65-85%
      rageClicks: {
        count: Math.floor(sessions * (0.02 + Math.random() * 0.03)), // 2-5% of sessions
        percentage: 2 + Math.random() * 3
      },
      deadClicks: {
        count: Math.floor(sessions * (0.01 + Math.random() * 0.02)), // 1-3% of sessions
        percentage: 1 + Math.random() * 2
      },
      quickBack: {
        percentage: 8 + Math.random() * 7 // 8-15%
      },
      scriptErrors: {
        count: Math.floor(sessions * (0.005 + Math.random() * 0.01)) // 0.5-1.5% of sessions
      },
      source: 'Mock'
    };
  }

  private generateMockTrends(params: ClarityParams): ClarityTrendPoint[] {
    const startDate = new Date(params.range.start);
    const endDate = new Date(params.range.end);
    const grain = params.range.grain || 'day';
    
    const points: ClarityTrendPoint[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const baseSessions = 100 + Math.random() * 200;
      const sessions = this.applyFilters(baseSessions, params.filters);
      
      points.push({
        date: dateStr,
        sessions,
        engagementTime: 30 + Math.random() * 60,
        scrollDepth: 50 + Math.random() * 40,
        rageClicks: Math.floor(sessions * (0.01 + Math.random() * 0.04)),
        deadClicks: Math.floor(sessions * (0.005 + Math.random() * 0.02)),
        quickBack: 5 + Math.random() * 15,
        scriptErrors: Math.floor(sessions * (0.001 + Math.random() * 0.01))
      });
      
      // Increment based on grain
      if (grain === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (grain === 'week') {
        current.setDate(current.getDate() + 7);
      } else if (grain === 'month') {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return points;
  }

  private generateMockUrls(params: ClarityParams): ClarityUrlRow[] {
    const mockUrls = [
      '/',
      '/anvandning',
      '/konverteringar',
      '/kundnojdhet',
      '/prestanda',
      '/installningar',
      '/profile',
      '/tables',
      '/charts',
      '/forms',
      '/calendar',
      '/auth/sign-in',
      '/ui-demo',
      '/ui-elements'
    ];
    
    return mockUrls.map(url => {
      const baseSessions = 50 + Math.random() * 500;
      const sessions = this.applyFilters(baseSessions, params.filters);
      const rageClicks = Math.floor(sessions * (0.01 + Math.random() * 0.05));
      const deadClicks = Math.floor(sessions * (0.005 + Math.random() * 0.03));
      
      return {
        url,
        sessions,
        engagementTime: 20 + Math.random() * 80,
        scrollDepth: 40 + Math.random() * 50,
        rageClicks: {
          count: rageClicks,
          per1k: sessions > 0 ? (rageClicks / sessions) * 1000 : 0
        },
        deadClicks: {
          count: deadClicks,
          per1k: sessions > 0 ? (deadClicks / sessions) * 1000 : 0
        },
        quickBack: 5 + Math.random() * 20,
        scriptErrors: Math.floor(sessions * (0.001 + Math.random() * 0.01)),
        source: 'Mock' as const
      };
    }).sort((a, b) => b.rageClicks.per1k - a.rageClicks.per1k); // Sort by rage clicks per 1k
  }

  private generateMockInsights(params: ClarityParams): ClarityInsight[] {
    const urls = this.generateMockUrls(params);
    
    return urls.slice(0, 10).map(url => {
      const ragePer1k = url.rageClicks.per1k;
      const deadPer1k = url.deadClicks.per1k;
      const quickBackPct = url.quickBack;
      
      // Calculate priority: sessions_weighted * friction_score
      // friction_score = w1*ragePer1k + w2*deadPer1k + w3*quickBackPct
      const w1 = 0.5, w2 = 0.3, w3 = 0.2;
      const frictionScore = (w1 * ragePer1k) + (w2 * deadPer1k) + (w3 * quickBackPct);
      const sessionsWeighted = Math.log(url.sessions + 1); // Log scale to prevent very high sessions from dominating
      const priority = sessionsWeighted * frictionScore;
      
      return {
        url: url.url,
        sessions: url.sessions,
        ragePer1k,
        deadPer1k,
        quickBackPct,
        priority,
        source: 'Mock' as const
      };
    }).sort((a, b) => b.priority - a.priority); // Sort by priority descending
  }

  private applyFilters(baseValue: number, filters?: ClarityFilters): number {
    if (!filters) return baseValue;
    
    let multiplier = 1;
    
    // Apply device filter
    if (filters.device && filters.device.length > 0) {
      multiplier *= 0.7; // Assume filtered data is 70% of total
    }
    
    // Apply country filter
    if (filters.country && filters.country.length > 0) {
      multiplier *= 0.6; // Assume filtered data is 60% of total
    }
    
    // Apply source filter
    if (filters.source && filters.source.length > 0) {
      multiplier *= 0.8; // Assume filtered data is 80% of total
    }
    
    // Apply browser filter
    if (filters.browser && filters.browser.length > 0) {
      multiplier *= 0.9; // Assume filtered data is 90% of total
    }
    
    // Apply OS filter
    if (filters.os && filters.os.length > 0) {
      multiplier *= 0.85; // Assume filtered data is 85% of total
    }
    
    return Math.floor(baseValue * multiplier);
  }
}

// Export singleton instance
export const clarityService = new ClarityService();

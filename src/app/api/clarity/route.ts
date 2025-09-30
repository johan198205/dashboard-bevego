import { NextRequest, NextResponse } from 'next/server';
import { getClarityDataFromDB, getClarityTimeseriesFromDB } from '@/lib/claritySync';
import type { ClarityOverview, ClarityTrendPoint } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ClarityApiError {
  error: string;
  details?: string;
}

/**
 * Map Clarity API response to our internal ClarityOverview type
 * Based on actual Microsoft Clarity Data Export API structure
 */
function mapToOverview(data: any, source: string): ClarityOverview {
  // Clarity returns array of metrics, each with metricName and information
  if (!Array.isArray(data)) {
    console.warn('Unexpected Clarity API response format:', data);
    return {
      sessions: 0,
      avgEngagementTime: 0,
      avgScrollDepth: 0,
      rageClicks: { count: 0, percentage: 0 },
      deadClicks: { count: 0, percentage: 0 },
      quickBack: { percentage: 0 },
      scriptErrors: { count: 0 },
      source: source as 'Mock' | 'Clarity API',
    };
  }

  // Helper to find metric by name
  const findMetric = (name: string) => 
    data.find((m: any) => m.metricName === name);

  // Extract metrics
  const traffic = findMetric('Traffic');
  const sessions = parseInt(traffic?.information?.[0]?.totalSessionCount || '0');
  
  const engagementTime = findMetric('EngagementTime');
  const avgEngagementTime = parseInt(engagementTime?.information?.[0]?.activeTime || '0');
  
  const scrollDepth = findMetric('ScrollDepth');
  const avgScrollDepth = scrollDepth?.information?.[0]?.averageScrollDepth || 0;
  
  const rageClicks = findMetric('RageClickCount');
  const rageClicksCount = parseInt(rageClicks?.information?.[0]?.subTotal || '0');
  const rageClicksPercentage = rageClicks?.information?.[0]?.sessionsWithMetricPercentage || 0;
  
  const deadClicks = findMetric('DeadClickCount');
  const deadClicksCount = parseInt(deadClicks?.information?.[0]?.subTotal || '0');
  const deadClicksPercentage = deadClicks?.information?.[0]?.sessionsWithMetricPercentage || 0;
  
  const quickBack = findMetric('QuickbackClick');
  const quickBackPercentage = quickBack?.information?.[0]?.sessionsWithMetricPercentage || 0;
  
  const scriptErrors = findMetric('ScriptErrorCount');
  const scriptErrorsCount = parseInt(scriptErrors?.information?.[0]?.subTotal || '0');
  
  return {
    sessions,
    avgEngagementTime,
    avgScrollDepth,
    rageClicks: {
      count: rageClicksCount,
      percentage: rageClicksPercentage,
    },
    deadClicks: {
      count: deadClicksCount,
      percentage: deadClicksPercentage,
    },
    quickBack: {
      percentage: quickBackPercentage,
    },
    scriptErrors: {
      count: scriptErrorsCount,
    },
    source: source as 'Mock' | 'Clarity API',
  };
}

/**
 * Map Clarity API timeseries to our internal ClarityTrendPoint array
 * TODO: Adjust mapping once exact Clarity API schema is confirmed
 */
function mapToTimeseries(data: any): ClarityTrendPoint[] {
  // TODO: Update field mappings based on actual Clarity API response structure
  if (!data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((point: any) => ({
    date: point.date,
    sessions: point.sessions || 0,
    engagementTime: point.engagementTime || point.avgEngagementTime || 0,
    scrollDepth: point.scrollDepth || point.avgScrollDepth || 0,
    rageClicks: point.rageClicks || 0,
    deadClicks: point.deadClicks || 0,
    quickBack: point.quickBackRate || point.quickBack || 0,
    scriptErrors: point.jsErrors || point.scriptErrors || 0,
  }));
}

/**
 * GET /api/clarity
 * 
 * Reads Clarity data from database (populated by daily sync)
 * 
 * Query parameters:
 * - start: Start date (YYYY-MM-DD) - required
 * - end: End date (YYYY-MM-DD) - required
 * - type: 'overview' | 'timeseries' - required
 * 
 * Note: Filters are not yet supported when reading from DB
 * TODO: Implement filter support in claritySync.ts
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const type = searchParams.get('type') || 'overview';
    
    // Validate required parameters
    if (!start || !end) {
      return NextResponse.json<ClarityApiError>(
        { error: 'Missing required parameters: start, end' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json<ClarityApiError>(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Fetch data from database
    if (type === 'timeseries') {
      const timeseriesData = await getClarityTimeseriesFromDB(start, end);
      
      if (timeseriesData.length === 0) {
        return NextResponse.json<ClarityApiError>(
          { 
            error: 'No Clarity data available',
            details: 'Database is empty. Run POST /api/clarity/sync to fetch data.'
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(timeseriesData);
    } else {
      // Default: overview
      const overviewData = await getClarityDataFromDB(start, end);
      
      if (!overviewData) {
        return NextResponse.json<ClarityApiError>(
          { 
            error: 'No Clarity data available',
            details: 'Database is empty. Run POST /api/clarity/sync to fetch data.'
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(overviewData);
    }

  } catch (error) {
    console.error('Clarity API route error:', error);
    
    // Return safe error message to client
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ClarityApiError>(
      { 
        error: 'Failed to fetch Clarity data',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

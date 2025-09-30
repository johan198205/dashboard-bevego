/**
 * Clarity Data Sync Service
 * Scheduled task that runs daily to fetch and store Clarity data
 */

import { prisma } from '@/lib/prisma';
import { getClarityClient } from '@/lib/clarityClient';

const DOMAIN = 'mitt.riksbyggen.se';

/**
 * Fetch last 3 days of Clarity data and store in database
 * This should be run daily via cron job
 */
export async function syncClarityData() {
  console.log('[Clarity Sync] Starting daily sync...');
  
  try {
    const client = getClarityClient();
    
    // Fetch last 3 days of data
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    console.log(`[Clarity Sync] Fetching data for last 3 days`);
    
    const data = await client.getMetrics({
      domain: DOMAIN,
      startDate: threeDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    });
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid Clarity API response');
    }
    
    // Parse metrics from Clarity response
    const findMetric = (name: string) => 
      data.find((m: any) => m.metricName === name);
    
    const traffic = findMetric('Traffic');
    const sessions = parseInt(traffic?.information?.[0]?.totalSessionCount || '0');
    
    const engagementTime = findMetric('EngagementTime');
    const avgEngagementTime = parseInt(engagementTime?.information?.[0]?.activeTime || '0');
    
    const scrollDepth = findMetric('ScrollDepth');
    const avgScrollDepth = scrollDepth?.information?.[0]?.averageScrollDepth || 0;
    
    const rageClicks = findMetric('RageClickCount');
    const rageClicksCount = parseInt(rageClicks?.information?.[0]?.subTotal || '0');
    const rageClicksPct = rageClicks?.information?.[0]?.sessionsWithMetricPercentage || 0;
    
    const deadClicks = findMetric('DeadClickCount');
    const deadClicksCount = parseInt(deadClicks?.information?.[0]?.subTotal || '0');
    const deadClicksPct = deadClicks?.information?.[0]?.sessionsWithMetricPercentage || 0;
    
    const quickBack = findMetric('QuickbackClick');
    const quickBackPct = quickBack?.information?.[0]?.sessionsWithMetricPercentage || 0;
    
    const scriptErrors = findMetric('ScriptErrorCount');
    const scriptErrorsCount = parseInt(scriptErrors?.information?.[0]?.subTotal || '0');
    
    // Store each of the last 3 days as separate snapshots
    // This allows us to build historical data over time
    for (let i = 0; i < 3; i++) {
      const snapshotDate = new Date(today);
      snapshotDate.setDate(today.getDate() - i);
      snapshotDate.setHours(0, 0, 0, 0); // Normalize to midnight
      
      await prisma.claritySnapshot.upsert({
        where: {
          date: snapshotDate,
        },
        update: {
          sessions,
          avgEngagementTime,
          avgScrollDepth,
          rageClicksCount,
          rageClicksPct,
          deadClicksCount,
          deadClicksPct,
          quickBackPct,
          scriptErrorsCount,
          rawData: JSON.stringify(data),
          fetchedAt: new Date(),
        },
        create: {
          date: snapshotDate,
          sessions,
          avgEngagementTime,
          avgScrollDepth,
          rageClicksCount,
          rageClicksPct,
          deadClicksCount,
          deadClicksPct,
          quickBackPct,
          scriptErrorsCount,
          rawData: JSON.stringify(data),
        },
      });
      
      console.log(`[Clarity Sync] ✓ Saved snapshot for ${snapshotDate.toISOString().split('T')[0]}`);
    }
    
    console.log('[Clarity Sync] ✓ Sync completed successfully');
    
    return {
      success: true,
      snapshotsSaved: 3,
      latestDate: today.toISOString().split('T')[0],
    };
    
  } catch (error) {
    console.error('[Clarity Sync] ✗ Sync failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get aggregated Clarity data from database for date range
 */
export async function getClarityDataFromDB(startDate: string, endDate: string) {
  const snapshots = await prisma.claritySnapshot.findMany({
    where: {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: {
      date: 'asc',
    },
  });
  
  if (snapshots.length === 0) {
    return null;
  }
  
  // If we have data, aggregate it
  // For now, we'll average metrics across the period
  const totalSnapshots = snapshots.length;
  
  const aggregated = {
    sessions: Math.round(snapshots.reduce((sum, s) => sum + s.sessions, 0) / totalSnapshots),
    avgEngagementTime: Math.round(snapshots.reduce((sum, s) => sum + s.avgEngagementTime, 0) / totalSnapshots),
    avgScrollDepth: parseFloat((snapshots.reduce((sum, s) => sum + s.avgScrollDepth, 0) / totalSnapshots).toFixed(2)),
    rageClicks: {
      count: Math.round(snapshots.reduce((sum, s) => sum + s.rageClicksCount, 0) / totalSnapshots),
      percentage: parseFloat((snapshots.reduce((sum, s) => sum + s.rageClicksPct, 0) / totalSnapshots).toFixed(2)),
    },
    deadClicks: {
      count: Math.round(snapshots.reduce((sum, s) => sum + s.deadClicksCount, 0) / totalSnapshots),
      percentage: parseFloat((snapshots.reduce((sum, s) => sum + s.deadClicksPct, 0) / totalSnapshots).toFixed(2)),
    },
    quickBack: {
      percentage: parseFloat((snapshots.reduce((sum, s) => sum + s.quickBackPct, 0) / totalSnapshots).toFixed(2)),
    },
    scriptErrors: {
      count: Math.round(snapshots.reduce((sum, s) => sum + s.scriptErrorsCount, 0) / totalSnapshots),
    },
    source: 'Clarity API' as const,
    dataPoints: totalSnapshots,
    dateRange: {
      start: snapshots[0].date.toISOString().split('T')[0],
      end: snapshots[snapshots.length - 1].date.toISOString().split('T')[0],
    },
  };
  
  return aggregated;
}

/**
 * Get timeseries data from database
 */
export async function getClarityTimeseriesFromDB(startDate: string, endDate: string) {
  const snapshots = await prisma.claritySnapshot.findMany({
    where: {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: {
      date: 'asc',
    },
  });
  
  return snapshots.map(snapshot => ({
    date: snapshot.date.toISOString().split('T')[0],
    sessions: snapshot.sessions,
    engagementTime: snapshot.avgEngagementTime,
    scrollDepth: snapshot.avgScrollDepth,
    rageClicks: snapshot.rageClicksCount,
    deadClicks: snapshot.deadClicksCount,
    quickBack: snapshot.quickBackPct,
    scriptErrors: snapshot.scriptErrorsCount,
  }));
}

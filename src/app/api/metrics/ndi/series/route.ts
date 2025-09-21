import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Period, NDISeriesPoint } from '@/types/ndi';
import { rolling4, normalizePeriod } from '@/lib/period';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') as Period;
    const to = searchParams.get('to') as Period;

    // Build where clause - if no parameters provided, get all data
    const whereClause: any = { metric: 'NDI' };
    if (from && to) {
      whereClause.period = {
        gte: from,
        lte: to
      };
    }

    // Get all NDI data for the specified period range (or all data if no range specified)
    const allPeriods = await prisma.metricPoint.findMany({
      where: whereClause,
      select: { period: true, value: true, source: true, groupA: true, groupB: true, groupC: true, weight: true },
      orderBy: { period: 'asc' },
    });

    // Group by normalized period and calculate values using same logic as summary
    const periodMap = new Map<string, { aggregated: number[], breakdown: number[] }>();
    
    for (const point of allPeriods) {
      // Normalize the period to standard format (YYYYQn)
      const normalizedPeriod = normalizePeriod(point.period);
      if (!normalizedPeriod) continue;
      
      if (!periodMap.has(normalizedPeriod)) {
        periodMap.set(normalizedPeriod, { aggregated: [], breakdown: [] });
      }
      
      if (point.source === 'AGGREGATED') {
        periodMap.get(normalizedPeriod)!.aggregated.push(point.value);
      } else if (point.source === 'BREAKDOWN') {
        periodMap.get(normalizedPeriod)!.breakdown.push(point.value);
      }
    }

    // Calculate average for each period using same logic as summary API
    const periodAverages = new Map<string, number>();
    for (const [period, data] of periodMap) {
      let ndiValue: number | null = null;
      
      // First, try to get aggregated values and calculate average
      if (data.aggregated.length > 0) {
        const sum = data.aggregated.reduce((sum, v) => sum + v, 0);
        ndiValue = sum / data.aggregated.length;
      } else if (data.breakdown.length > 0) {
        // Calculate from breakdowns
        const sum = data.breakdown.reduce((sum, v) => sum + v, 0);
        ndiValue = sum / data.breakdown.length;
      }
      
      if (ndiValue !== null) {
        periodAverages.set(period, ndiValue);
      }
    }

    // Convert to series format and sort chronologically
    const series: NDISeriesPoint[] = Array.from(periodAverages.entries())
      .map(([period, value]) => ({
        period: period as Period,
        value: value,
      }))
      .sort((a, b) => {
        // Sort periods chronologically
        const [yearA, quarterA] = a.period.split('Q').map(Number);
        const [yearB, quarterB] = b.period.split('Q').map(Number);
        if (yearA !== yearB) return yearA - yearB;
        return quarterA - quarterB;
      });

    // Calculate rolling 4Q averages
    const seriesWithRolling = rolling4(series);

    // Add YoY comparison (same quarter previous year)
    const seriesWithYoY = seriesWithRolling.map(point => {
      const [year, quarter] = point.period.split('Q').map(Number);
      const prevYear = year - 1;
      const prevYearPeriod = `${prevYear}Q${quarter}` as Period;
      
      const prevYearData = series.find(s => s.period === prevYearPeriod);
      
      return {
        ...point,
        yoy: prevYearData?.value || null
      };
    });

    return NextResponse.json(seriesWithYoY);
  } catch (error) {
    console.error('Error fetching NDI series:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NDI series' },
      { status: 500 }
    );
  }
}
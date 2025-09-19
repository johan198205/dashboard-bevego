import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NDISummary, Period } from '@/types/ndi';
import { qoq, yoy, getPreviousQuarter, getPreviousYearQuarter, rolling4q } from '@/lib/ndi-calculations';
import { prevQuarter, yoyQuarter } from '@/lib/period';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as Period;

    if (!period) {
      return NextResponse.json({ error: 'Period parameter is required' }, { status: 400 });
    }

    // Get NDI value for the requested period
    // Prefer aggregated data, fallback to calculated from breakdowns
    let ndiValue: number | null = null;

    // First, try to get aggregated values and calculate average
    const aggregatedValues = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
        source: 'AGGREGATED',
      },
    });

    if (aggregatedValues.length > 0) {
      // Calculate average of all aggregated values
      const sum = aggregatedValues.reduce((sum, v) => sum + v.value, 0);
      ndiValue = sum / aggregatedValues.length;
    } else {
      // Calculate from breakdowns
      const breakdownValues = await prisma.metricPoint.findMany({
        where: {
          period,
          metric: 'NDI',
          source: 'BREAKDOWN',
        },
      });

      if (breakdownValues.length > 0) {
        // Use the existing NDI values directly - they are already calculated
        const sum = breakdownValues.reduce((sum, v) => sum + v.value, 0);
        ndiValue = sum / breakdownValues.length;
      }
    }

    if (ndiValue === null) {
      return NextResponse.json({ error: 'No data found for the specified period' }, { status: 404 });
    }

    // Ensure ndiValue is finite
    if (!isFinite(ndiValue)) {
      return NextResponse.json({ error: 'Invalid data found for the specified period' }, { status: 500 });
    }

    // Calculate QoQ change
    let qoqChange: number | undefined;
    const prevQ = prevQuarter(period);
    if (prevQ) {
      const prevValue = await getNDIValue(prevQ);
      if (prevValue !== null && isFinite(prevValue)) {
        const qoqResult = qoq(ndiValue, prevValue);
        qoqChange = qoqResult !== null ? qoqResult : undefined;
      }
    }

    // Calculate YoY change
    let yoyChange: number | undefined;
    const prevYearQ = yoyQuarter(period);
    const prevYearValue = await getNDIValue(prevYearQ);
    if (prevYearValue !== null && isFinite(prevYearValue)) {
      const yoyResult = yoy(ndiValue, prevYearValue);
      yoyChange = yoyResult !== null ? yoyResult : undefined;
    }

    // Calculate rolling 4Q average
    const series = await getNDISeries();
    const rolling4qValue = rolling4q(series, period);

    const summary: NDISummary = {
      period,
      total: ndiValue,
      qoqChange,
      yoyChange,
      rolling4q: rolling4qValue || undefined,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching NDI summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NDI summary' },
      { status: 500 }
    );
  }
}

async function getNDIValue(period: Period): Promise<number | null> {
  // Try aggregated first - calculate average of all aggregated values
  const aggregatedValues = await prisma.metricPoint.findMany({
    where: {
      period,
      metric: 'NDI',
      source: 'AGGREGATED',
    },
  });

  if (aggregatedValues.length > 0) {
    const sum = aggregatedValues.reduce((sum, v) => sum + v.value, 0);
    return sum / aggregatedValues.length;
  }

  // Calculate from breakdowns
  const breakdownValues = await prisma.metricPoint.findMany({
    where: {
      period,
      metric: 'NDI',
      source: 'BREAKDOWN',
    },
  });

  if (breakdownValues.length === 0) {
    return null;
  }

  // Use the existing NDI values directly - they are already calculated
  const sum = breakdownValues.reduce((sum, v) => sum + v.value, 0);
  return sum / breakdownValues.length;
}

async function getNDISeries() {
  const allPeriods = await prisma.metricPoint.findMany({
    where: { metric: 'NDI' },
    select: { period: true, value: true, source: true, groupA: true, groupB: true, groupC: true, weight: true },
    orderBy: { period: 'asc' },
  });

  // Group by period and calculate values
  const periodMap = new Map<string, { value: number | null; source: string }>();
  
  for (const point of allPeriods) {
    if (!periodMap.has(point.period)) {
      periodMap.set(point.period, { value: null, source: 'BREAKDOWN' });
    }
    
    const existing = periodMap.get(point.period)!;
    
    // Prefer aggregated data
    if (point.source === 'AGGREGATED' && point.groupA === null) {
      existing.value = point.value;
      existing.source = 'AGGREGATED';
    } else if (existing.source === 'BREAKDOWN' && existing.value === null) {
      // This will be calculated later
      existing.value = point.value; // Placeholder
    }
  }

  // Calculate breakdown values where needed
  for (const [period, data] of periodMap) {
    if (data.source === 'BREAKDOWN') {
      const breakdownValues = allPeriods.filter(p => 
        p.period === period && p.source === 'BREAKDOWN'
      );
      
      if (breakdownValues.length > 0) {
        const hasWeights = breakdownValues.some(v => v.weight && v.weight > 0);
        
        if (hasWeights) {
          const numerator = breakdownValues.reduce((sum, v) => sum + v.value * (v.weight || 0), 0);
          const denominator = breakdownValues.reduce((sum, v) => sum + (v.weight || 0), 0);
          data.value = denominator > 0 ? numerator / denominator : null;
        } else {
          const sum = breakdownValues.reduce((sum, v) => sum + v.value, 0);
          data.value = sum / breakdownValues.length;
        }
      }
    }
  }

  return Array.from(periodMap.entries()).map(([period, data]) => ({
    period: period as Period,
    value: data.value,
  }));
}

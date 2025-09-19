import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NDISeriesPoint, Period } from '@/types/ndi';
import { rolling4q, sortPeriods } from '@/lib/ndi-calculations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') as Period;
    const to = searchParams.get('to') as Period;

    // Get all NDI data
    const allPeriods = await prisma.metricPoint.findMany({
      where: { metric: 'NDI' },
      select: { 
        period: true, 
        value: true, 
        source: true, 
        groupA: true, 
        groupB: true, 
        groupC: true, 
        weight: true 
      },
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

    // Convert to series format
    let series: NDISeriesPoint[] = Array.from(periodMap.entries()).map(([period, data]) => ({
      period: period as Period,
      value: data.value,
    }));

    // Sort by period
    series = series.sort((a, b) => {
      const [yearA, quarterA] = a.period.split('Q').map(Number);
      const [yearB, quarterB] = b.period.split('Q').map(Number);
      
      if (yearA !== yearB) return yearA - yearB;
      return quarterA - quarterB;
    });

    // Filter by date range if specified
    if (from || to) {
      series = series.filter(point => {
        if (from && point.period < from) return false;
        if (to && point.period > to) return false;
        return true;
      });
    }

    // Calculate rolling 4Q for each point
    const seriesWithR4 = series.map(point => {
      const r4 = rolling4q(series, point.period);
      return {
        ...point,
        r4: r4 || undefined,
      };
    });

    return NextResponse.json(seriesWithR4);
  } catch (error) {
    console.error('Error fetching NDI series:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NDI series' },
      { status: 500 }
    );
  }
}

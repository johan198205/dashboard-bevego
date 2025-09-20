import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Period, BreakdownRow } from '@/types/ndi';
import { prevQuarter, yoyQuarter } from '@/lib/period';

export interface BreakdownWithHistory extends BreakdownRow {
  qoqChange?: number; // Quarter over Quarter change in %
  yoyChange?: number; // Year over Year change in %
  prevQuarterValue?: number; // Previous quarter value for display
  prevYearValue?: number; // Previous year value for display
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as Period;

    if (!period) {
      return NextResponse.json({ error: 'Period parameter is required' }, { status: 400 });
    }

    // Get breakdown data for the specified period (use AGGREGATED for descriptive labels)
    const breakdownData = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
        source: 'AGGREGATED',
      },
      select: {
        groupA: true,
        groupB: true,
        groupC: true,
        value: true,
        weight: true,
      },
      orderBy: [
        { groupA: 'asc' },
        { groupB: 'asc' },
        { groupC: 'asc' },
      ],
    });

    // Get historical data for QoQ and YoY calculations
    const prevQuarterPeriod = prevQuarter(period);
    const yoyQuarterPeriod = yoyQuarter(period);

    // Fetch previous quarter data
    const prevQuarterData = prevQuarterPeriod ? await prisma.metricPoint.findMany({
      where: {
        period: prevQuarterPeriod,
        metric: 'NDI',
        source: 'AGGREGATED',
      },
      select: {
        groupA: true,
        groupB: true,
        groupC: true,
        value: true,
      },
    }) : [];

    // Fetch YoY quarter data
    const yoyQuarterData = await prisma.metricPoint.findMany({
      where: {
        period: yoyQuarterPeriod,
        metric: 'NDI',
        source: 'AGGREGATED',
      },
      select: {
        groupA: true,
        groupB: true,
        groupC: true,
        value: true,
      },
    });

    // Create lookup maps for historical data
    const createLookupKey = (row: any) => 
      `${row.groupA || ''}|${row.groupB || ''}|${row.groupC || ''}`;

    const prevQuarterMap = new Map(
      prevQuarterData.map(row => [createLookupKey(row), row.value])
    );

    const yoyQuarterMap = new Map(
      yoyQuarterData.map(row => [createLookupKey(row), row.value])
    );

    // Convert to breakdown format with historical changes
    const breakdownWithHistory: BreakdownWithHistory[] = breakdownData.map(row => {
      const key = createLookupKey(row);
      const prevValue = prevQuarterMap.get(key);
      const yoyValue = yoyQuarterMap.get(key);

      // Calculate QoQ change
      let qoqChange: number | undefined;
      if (prevValue !== undefined && prevValue !== null && row.value !== null) {
        qoqChange = prevValue !== 0 ? ((row.value - prevValue) / prevValue) * 100 : 0;
      }

      // Calculate YoY change
      let yoyChange: number | undefined;
      if (yoyValue !== undefined && yoyValue !== null && row.value !== null) {
        yoyChange = yoyValue !== 0 ? ((row.value - yoyValue) / yoyValue) * 100 : 0;
      }

      return {
        period,
        groupA: row.groupA || undefined,
        groupB: row.groupB || undefined,
        groupC: row.groupC || undefined,
        value: row.value,
        weight: row.weight || undefined,
        qoqChange,
        yoyChange,
        prevQuarterValue: prevValue,
        prevYearValue: yoyValue,
      };
    });

    return NextResponse.json(breakdownWithHistory);
  } catch (error) {
    console.error('Error fetching NDI breakdown with history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NDI breakdown with history' },
      { status: 500 }
    );
  }
}

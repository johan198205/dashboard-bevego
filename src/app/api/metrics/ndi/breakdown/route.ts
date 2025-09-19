import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BreakdownRow, Period } from '@/types/ndi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as Period;

    if (!period) {
      return NextResponse.json({ error: 'Period parameter is required' }, { status: 400 });
    }

    // Get breakdown data for the specified period
    const breakdownData = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
        source: 'BREAKDOWN',
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

    const breakdownRows: BreakdownRow[] = breakdownData.map(row => ({
      period,
      groupA: row.groupA || undefined,
      groupB: row.groupB || undefined,
      groupC: row.groupC || undefined,
      value: row.value,
      weight: row.weight || undefined,
    }));

    return NextResponse.json(breakdownRows);
  } catch (error) {
    console.error('Error fetching NDI breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NDI breakdown' },
      { status: 500 }
    );
  }
}

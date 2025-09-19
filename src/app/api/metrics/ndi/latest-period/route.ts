import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePeriod } from '@/lib/period';

export async function GET() {
  try {
    const latest = await prisma.metricPoint.findFirst({
      where: { metric: 'NDI' },
      select: { period: true },
      orderBy: { period: 'desc' },
    });

    if (!latest?.period) {
      return NextResponse.json(null);
    }

    // Normalize the period to standard format (YYYYQn)
    const normalizedPeriod = normalizePeriod(latest.period);
    
    return NextResponse.json(normalizedPeriod || latest.period);
  } catch (error) {
    console.error('Error fetching latest period:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest period' },
      { status: 500 }
    );
  }
}

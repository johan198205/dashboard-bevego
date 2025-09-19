import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const latest = await prisma.metricPoint.findFirst({
      where: { metric: 'NDI' },
      select: { period: true },
      orderBy: { period: 'desc' },
    });

    return NextResponse.json(latest?.period || null);
  } catch (error) {
    console.error('Error fetching latest period:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest period' },
      { status: 500 }
    );
  }
}

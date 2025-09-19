import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '4Q2024';

    // Get all NDI data for the period
    const allData = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
      },
      orderBy: [
        { source: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Get file uploads for context
    const fileUploads = await prisma.fileUpload.findMany({
      where: {
        period,
        active: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return NextResponse.json({
      period,
      totalRows: allData.length,
      aggregatedRows: allData.filter(d => d.source === 'AGGREGATED'),
      breakdownRows: allData.filter(d => d.source === 'BREAKDOWN'),
      fileUploads,
      allData,
    });
  } catch (error) {
    console.error('Error fetching debug data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}


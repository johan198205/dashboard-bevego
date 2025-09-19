import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      return NextResponse.json({ error: 'Period parameter is required' }, { status: 400 });
    }

    // Delete all metric points for the period
    const deleted = await prisma.metricPoint.deleteMany({
      where: {
        period,
        metric: 'NDI',
      },
    });

    // Also delete file uploads for the period
    await prisma.fileUpload.deleteMany({
      where: {
        period,
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      deletedRows: deleted.count,
      period,
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    );
  }
}


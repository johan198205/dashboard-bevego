import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Period, AreaBreakdown, GenderBreakdown, AgeGroupBreakdown, DeviceBreakdown, OSBreakdown, BrowserBreakdown, ResponseDistribution } from '@/types/ndi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as Period;
    const area = searchParams.get('area');

    if (!period || !area) {
      return NextResponse.json({ error: 'Period and area parameters are required' }, { status: 400 });
    }

    // Get the actual NDI data for this area from AGGREGATED source
    const areaData = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
        source: 'AGGREGATED',
        groupA: {
          contains: area, // Use contains to match area names with \r\n
        },
      },
      select: {
        groupA: true,
        groupB: true,
        groupC: true,
        value: true,
        weight: true,
      },
    });

    // Get breakdown data for segments (for future use)
    const breakdownData = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
        source: 'BREAKDOWN',
        groupA: {
          contains: area,
        },
      },
      select: {
        groupA: true,
        groupB: true,
        groupC: true,
        value: true,
        weight: true,
      },
    });

    // Get the actual NDI value from AGGREGATED data
    const matchingAreaRow = areaData.find(row => 
      row.groupA && row.groupA.includes(area)
    ) || areaData[0];
    
    const areaNDI = matchingAreaRow?.value || 0;
    const totalResponses = matchingAreaRow?.weight || breakdownData.reduce((sum, row) => sum + (row.weight || 0), 0);

    // For now, return mock data since detailed segment data is not yet available
    // This will be replaced with real data when segment breakdowns are uploaded
    const mockBreakdown: AreaBreakdown = {
      area,
      period,
      totalNDI: areaNDI, // Use the actual NDI value from database
      totalResponses: totalResponses > 0 ? totalResponses : 86, // Use actual count or fallback
      gender: {
        male: { ndi: 72.3, count: 45, percentage: 52.3 },
        female: { ndi: 68.7, count: 41, percentage: 47.7 },
        delta: 3.6
      },
      ageGroups: {
        '18-29': { ndi: 65.2, count: 12, percentage: 14.0 },
        '30-44': { ndi: 70.8, count: 28, percentage: 32.6 },
        '45-59': { ndi: 71.5, count: 31, percentage: 36.0 },
        '60+': { ndi: 73.1, count: 15, percentage: 17.4 }
      },
      device: {
        mobile: { ndi: 69.2, count: 52, percentage: 60.5 },
        desktop: { ndi: 71.8, count: 34, percentage: 39.5 }
      },
      os: {
        android: { ndi: 68.9, count: 28, percentage: 32.6 },
        ios: { ndi: 69.6, count: 24, percentage: 27.9 }
      },
      browser: {
        chrome: { ndi: 70.4, count: 48, percentage: 55.8 },
        safari: { ndi: 69.8, count: 22, percentage: 25.6 },
        edge: { ndi: 71.2, count: 16, percentage: 18.6 }
      },
      responseDistribution: {
        1: { count: 2, percentage: 2.3, ndiContribution: -2.3, label: 'Stämmer inte alls' },
        2: { count: 4, percentage: 4.7, ndiContribution: -4.7, label: 'Stämmer inte' },
        3: { count: 12, percentage: 14.0, ndiContribution: 0, label: 'Varken eller' },
        4: { count: 35, percentage: 40.7, ndiContribution: 40.7, label: 'Stämmer' },
        5: { count: 33, percentage: 38.4, ndiContribution: 38.4, label: 'Stämmer helt' }
      },
      minSampleSize: 30 // From UI settings
    };

    // Debug logging to see what data we're getting
    console.log('Area breakdown data:', {
      area,
      period,
      areaDataCount: areaData.length,
      breakdownDataCount: breakdownData.length,
      areaNDI,
      totalResponses,
      matchingAreaRow: matchingAreaRow?.groupA,
      firstAreaRow: areaData[0]?.groupA
    });

    return NextResponse.json(mockBreakdown);
  } catch (error) {
    console.error('Error fetching area breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch area breakdown' },
      { status: 500 }
    );
  }
}

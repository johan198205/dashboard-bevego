import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Period, DemographicBreakdown, DemographicSegment } from '@/types/ndi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as Period;

    if (!period) {
      return NextResponse.json({ error: 'Period parameter is required' }, { status: 400 });
    }

    // Get all demographic breakdown rows for the specified period from AGGREGATED source
    const indexRows = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
        source: 'BREAKDOWN',
        groupA: 'Index', // groupA should be "Index" for demographic breakdowns
        groupC: {
          not: null, // groupC should contain demographic segment values
        },
      },
      select: {
        groupA: true, // Should be "Index"
        groupB: true, // Demographics dimension (Kön, Ålder, Enhet, OS, Browser)
        groupC: true, // Segment value (Man, Kvinna, 18-25, Mobile, etc.)
        value: true,
        weight: true,
      },
    });

    if (indexRows.length === 0) {
      return NextResponse.json({ error: 'No Index data found for the specified period' }, { status: 404 });
    }

    // Helper function to calculate average NDI for a segment
    const calculateSegmentAverage = (rows: typeof indexRows): DemographicSegment => {
      if (rows.length === 0) {
        return { ndi: null, count: 0 };
      }

      const hasWeights = rows.some(row => row.weight && row.weight > 0);
      
      if (hasWeights) {
        const totalWeight = rows.reduce((sum, row) => sum + (row.weight || 0), 0);
        const weightedSum = rows.reduce((sum, row) => sum + (row.value * (row.weight || 0)), 0);
        const avgNDI = totalWeight > 0 ? weightedSum / totalWeight : null;
        return { ndi: avgNDI, count: Math.round(totalWeight) };
      } else {
        const avgNDI = rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
        return { ndi: avgNDI, count: rows.length };
      }
    };

    // Helper function to calculate delta between two segments
    const calculateDelta = (segment1: DemographicSegment, segment2: DemographicSegment): number | null => {
      if (segment1.ndi === null || segment2.ndi === null) {
        return null;
      }
      return segment1.ndi - segment2.ndi;
    };

    // We already filtered for rows with groupC not null, so we should have demographic data

    // Group data by demographic dimension
    const groupedData = new Map<string, Map<string, typeof indexRows>>();
    
    for (const row of indexRows) {
      const dimension = row.groupB;
      const segment = row.groupC;
      
      if (!dimension || !segment) continue;
      
      if (!groupedData.has(dimension)) {
        groupedData.set(dimension, new Map());
      }
      
      const dimensionMap = groupedData.get(dimension)!;
      if (!dimensionMap.has(segment)) {
        dimensionMap.set(segment, []);
      }
      
      dimensionMap.get(segment)!.push(row);
    }

    // Build breakdown data
    const breakdown: DemographicBreakdown = {
      period,
      gender: { male: { ndi: null, count: 0 }, female: { ndi: null, count: 0 }, delta: null },
      ageGroups: {},
      device: { mobile: { ndi: null, count: 0 }, desktop: { ndi: null, count: 0 }, delta: null },
      os: { android: { ndi: null, count: 0 }, ios: { ndi: null, count: 0 }, delta: null },
      browser: { chrome: { ndi: null, count: 0 }, safari: { ndi: null, count: 0 }, edge: { ndi: null, count: 0 } },
      riksbyggenBuilt: { yes: { ndi: null, count: 0 }, no: { ndi: null, count: 0 }, delta: null },
      riksbyggenManaged: { yes: { ndi: null, count: 0 }, no: { ndi: null, count: 0 }, delta: null },
      informationFound: { yes: { ndi: null, count: 0 }, partially: { ndi: null, count: 0 }, no: { ndi: null, count: 0 } },
    };

    // Process each demographic dimension
    for (const [dimension, segmentMap] of groupedData) {
      const dimensionLower = dimension.toLowerCase();

      // Gender breakdown
      if (dimensionLower.includes('kön') || dimensionLower.includes('gender') || dimensionLower.includes('sex')) {
        const maleRows = segmentMap.get('Man') || segmentMap.get('Male') || segmentMap.get('Män') || [];
        const femaleRows = segmentMap.get('Kvinna') || segmentMap.get('Female') || segmentMap.get('Kvinnor') || [];
        
        breakdown.gender.male = calculateSegmentAverage(maleRows);
        breakdown.gender.female = calculateSegmentAverage(femaleRows);
        breakdown.gender.delta = calculateDelta(breakdown.gender.female, breakdown.gender.male);
      }

      // Age groups breakdown
      else if (dimensionLower.includes('ålder') || dimensionLower.includes('age')) {
        for (const [segment, rows] of segmentMap) {
          breakdown.ageGroups[segment] = calculateSegmentAverage(rows);
        }
      }

      // Device breakdown
      else if (dimensionLower.includes('enhet') || dimensionLower.includes('device')) {
        const mobileRows = segmentMap.get('Mobile') || segmentMap.get('Mobil') || [];
        const desktopRows = segmentMap.get('Desktop') || segmentMap.get('Dator') || [];
        
        breakdown.device.mobile = calculateSegmentAverage(mobileRows);
        breakdown.device.desktop = calculateSegmentAverage(desktopRows);
        breakdown.device.delta = calculateDelta(breakdown.device.mobile, breakdown.device.desktop);
      }

      // OS breakdown
      else if (dimensionLower.includes('os') || dimensionLower.includes('operativsystem') || dimensionLower.includes('platform')) {
        const androidRows = segmentMap.get('Android') || [];
        const iosRows = segmentMap.get('iOS') || segmentMap.get('iPhone') || [];
        
        breakdown.os.android = calculateSegmentAverage(androidRows);
        breakdown.os.ios = calculateSegmentAverage(iosRows);
        breakdown.os.delta = calculateDelta(breakdown.os.ios, breakdown.os.android);
      }

      // Browser breakdown
      else if (dimensionLower.includes('browser') || dimensionLower.includes('webbläsare')) {
        const chromeRows = segmentMap.get('Chrome') || [];
        const safariRows = segmentMap.get('Safari') || [];
        const edgeRows = segmentMap.get('Edge') || segmentMap.get('Microsoft Edge') || [];
        
        breakdown.browser.chrome = calculateSegmentAverage(chromeRows);
        breakdown.browser.safari = calculateSegmentAverage(safariRows);
        breakdown.browser.edge = calculateSegmentAverage(edgeRows);
      }

      // Riksbyggen Built breakdown - handle specific Excel column headers
      else if (dimensionLower.includes('bor du i ett hus som riksbyggen byggt')) {
        const yesRows = segmentMap.get('Ja') || segmentMap.get('Yes') || [];
        const noRows = segmentMap.get('Nej') || segmentMap.get('No') || [];
        
        breakdown.riksbyggenBuilt.yes = calculateSegmentAverage(yesRows);
        breakdown.riksbyggenBuilt.no = calculateSegmentAverage(noRows);
        breakdown.riksbyggenBuilt.delta = calculateDelta(breakdown.riksbyggenBuilt.yes, breakdown.riksbyggenBuilt.no);
      }

      // Riksbyggen Managed breakdown - handle specific Excel column headers
      else if (dimensionLower.includes('bor du i ett hus som riksbyggen förvaltar')) {
        const yesRows = segmentMap.get('Ja') || segmentMap.get('Yes') || [];
        const noRows = segmentMap.get('Nej') || segmentMap.get('No') || [];
        
        breakdown.riksbyggenManaged.yes = calculateSegmentAverage(yesRows);
        breakdown.riksbyggenManaged.no = calculateSegmentAverage(noRows);
        breakdown.riksbyggenManaged.delta = calculateDelta(breakdown.riksbyggenManaged.yes, breakdown.riksbyggenManaged.no);
      }

      // Information Found breakdown - handle specific Excel column headers
      else if (dimensionLower.includes('hittade den information de sökte')) {
        const yesRows = segmentMap.get('Ja') || segmentMap.get('Yes') || segmentMap.get('Ja/Ja, delvis') || [];
        const partiallyRows = segmentMap.get('Ja, delvis') || segmentMap.get('Yes, partially') || segmentMap.get('Delvis') || segmentMap.get('Partially') || [];
        const noRows = segmentMap.get('Nej') || segmentMap.get('No') || [];
        
        breakdown.informationFound.yes = calculateSegmentAverage(yesRows);
        breakdown.informationFound.partially = calculateSegmentAverage(partiallyRows);
        breakdown.informationFound.no = calculateSegmentAverage(noRows);
      }
    }

    return NextResponse.json(breakdown);
  } catch (error) {
    console.error('Error fetching demographic breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demographic breakdown' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Period, DemographicBreakdown, DemographicSegment } from '@/types/ndi';
import { prevQuarter } from '@/lib/period';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as Period;

    if (!period) {
      return NextResponse.json({ error: 'Period parameter is required' }, { status: 400 });
    }

    // Get all demographic breakdown rows for the specified period from BREAKDOWN source
    const indexRows = await prisma.metricPoint.findMany({
      where: {
        periodId: period,
        metric: 'NDI',
        source: 'BREAKDOWN',
        superseded: false,
        groupA: { startsWith: 'Index' }, // groupA should start with "Index" (including 'Index_xxx' for multiple rows)
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

    // Note: Data is now read directly from MetricPoint table in database
    // The Excel parser stores Index values from Row 24 with NETTO base from Row 10/20



  // Helper function to round to 2 decimals with HALF_UP rounding (rounds 0.5 up instead of to even)
  const roundToTwoDecimals = (value: number): number => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  };

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
        
        if (avgNDI !== null) {
          // Round NDI value to 2 decimals
          return { ndi: roundToTwoDecimals(avgNDI), count: Math.round(totalWeight) };
        }
        
        return { ndi: null, count: Math.round(totalWeight) };
      } else {
        const avgNDI = rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
        // Round NDI value to 2 decimals
        return { ndi: roundToTwoDecimals(avgNDI), count: rows.length };
      }
    };

    // Helper function to calculate delta between two segments
    const calculateDelta = (segment1: DemographicSegment, segment2: DemographicSegment): number | null => {
      if (segment1.ndi === null || segment2.ndi === null) {
        return null;
      }
      return segment1.ndi - segment2.ndi;
    };


    // Helper function to add QoQ data to all segments in breakdown
    const addQoQData = async (breakdown: DemographicBreakdown, targetPeriod: Period): Promise<DemographicBreakdown> => {
      const prevQ = prevQuarter(targetPeriod);
      if (!prevQ) {
        return breakdown;
      }

      // Helper to get previous quarter segment data
      const getPrevSegmentData = async (dimension: string, segment: string): Promise<{ ndi: number | null, count: number }> => {
        try {
          const prevRows = await prisma.metricPoint.findMany({
            where: {
              periodId: prevQ,
              metric: 'NDI',
              source: 'BREAKDOWN',
              superseded: false,
              groupA: 'Index',
              groupB: dimension,
              groupC: segment,
            },
            select: {
              value: true,
              weight: true,
            },
          });

          if (prevRows.length === 0) {
            return { ndi: null, count: 0 };
          }

          const hasWeights = prevRows.some(row => row.weight && row.weight > 0);
          let prevValue: number | null = null;
          let prevCount = 0;

          if (hasWeights) {
            const totalWeight = prevRows.reduce((sum, row) => sum + (row.weight || 0), 0);
            const weightedSum = prevRows.reduce((sum, row) => sum + (row.value * (row.weight || 0)), 0);
            const avgNDI = totalWeight > 0 ? weightedSum / totalWeight : null;
            prevValue = avgNDI !== null ? roundToTwoDecimals(avgNDI) : null;
            prevCount = Math.round(totalWeight);
          } else {
            const avgNDI = prevRows.reduce((sum, row) => sum + row.value, 0) / prevRows.length;
            prevValue = roundToTwoDecimals(avgNDI);
            prevCount = prevRows.length;
          }

          return { ndi: prevValue, count: prevCount };
        } catch (error) {
          console.error(`Error fetching previous quarter data for ${dimension}/${segment}:`, error);
          return { ndi: null, count: 0 };
        }
      };

      // Add QoQ data to gender breakdown
      const malePrevData = await getPrevSegmentData('Kön', 'Man');
      const femalePrevData = await getPrevSegmentData('Kön', 'Kvinna');
      
      breakdown.gender.male = {
        ...breakdown.gender.male,
        qoqChange: breakdown.gender.male.ndi !== null && malePrevData.ndi !== null && malePrevData.ndi !== 0 ? 
          ((breakdown.gender.male.ndi - malePrevData.ndi) / malePrevData.ndi) * 100 : null,
        prevQuarterValue: malePrevData.ndi
      };
      
      breakdown.gender.female = {
        ...breakdown.gender.female,
        qoqChange: breakdown.gender.female.ndi !== null && femalePrevData.ndi !== null && femalePrevData.ndi !== 0 ? 
          ((breakdown.gender.female.ndi - femalePrevData.ndi) / femalePrevData.ndi) * 100 : null,
        prevQuarterValue: femalePrevData.ndi
      };

      // Add QoQ data to device breakdown
      const mobilePrevData = await getPrevSegmentData('Enhet', 'Mobile');
      const desktopPrevData = await getPrevSegmentData('Enhet', 'Desktop');
      
      breakdown.device.mobile = {
        ...breakdown.device.mobile,
        qoqChange: breakdown.device.mobile.ndi !== null && mobilePrevData.ndi !== null && mobilePrevData.ndi !== 0 ? 
          ((breakdown.device.mobile.ndi - mobilePrevData.ndi) / mobilePrevData.ndi) * 100 : null,
        prevQuarterValue: mobilePrevData.ndi
      };
      
      breakdown.device.desktop = {
        ...breakdown.device.desktop,
        qoqChange: breakdown.device.desktop.ndi !== null && desktopPrevData.ndi !== null && desktopPrevData.ndi !== 0 ? 
          ((breakdown.device.desktop.ndi - desktopPrevData.ndi) / desktopPrevData.ndi) * 100 : null,
        prevQuarterValue: desktopPrevData.ndi
      };

      // Add QoQ data to OS breakdown
      const androidPrevData = await getPrevSegmentData('OS', 'Android');
      const iosPrevData = await getPrevSegmentData('OS', 'iOS');
      
      breakdown.os.android = {
        ...breakdown.os.android,
        qoqChange: breakdown.os.android.ndi !== null && androidPrevData.ndi !== null && androidPrevData.ndi !== 0 ? 
          ((breakdown.os.android.ndi - androidPrevData.ndi) / androidPrevData.ndi) * 100 : null,
        prevQuarterValue: androidPrevData.ndi
      };
      
      breakdown.os.ios = {
        ...breakdown.os.ios,
        qoqChange: breakdown.os.ios.ndi !== null && iosPrevData.ndi !== null && iosPrevData.ndi !== 0 ? 
          ((breakdown.os.ios.ndi - iosPrevData.ndi) / iosPrevData.ndi) * 100 : null,
        prevQuarterValue: iosPrevData.ndi
      };

      // Add QoQ data to browser breakdown
      const chromePrevData = await getPrevSegmentData('Browser', 'Chrome');
      const safariPrevData = await getPrevSegmentData('Browser', 'Safari');
      const edgePrevData = await getPrevSegmentData('Browser', 'Edge');
      
      breakdown.browser.chrome = {
        ...breakdown.browser.chrome,
        qoqChange: breakdown.browser.chrome.ndi !== null && chromePrevData.ndi !== null && chromePrevData.ndi !== 0 ? 
          ((breakdown.browser.chrome.ndi - chromePrevData.ndi) / chromePrevData.ndi) * 100 : null,
        prevQuarterValue: chromePrevData.ndi
      };
      
      breakdown.browser.safari = {
        ...breakdown.browser.safari,
        qoqChange: breakdown.browser.safari.ndi !== null && safariPrevData.ndi !== null && safariPrevData.ndi !== 0 ? 
          ((breakdown.browser.safari.ndi - safariPrevData.ndi) / safariPrevData.ndi) * 100 : null,
        prevQuarterValue: safariPrevData.ndi
      };
      
      breakdown.browser.edge = {
        ...breakdown.browser.edge,
        qoqChange: breakdown.browser.edge.ndi !== null && edgePrevData.ndi !== null && edgePrevData.ndi !== 0 ? 
          ((breakdown.browser.edge.ndi - edgePrevData.ndi) / edgePrevData.ndi) * 100 : null,
        prevQuarterValue: edgePrevData.ndi
      };

      return breakdown;
    };

    // We already filtered for rows with groupC not null, so we should have demographic data

    // Group data by demographic dimension
    const groupedData = new Map<string, Map<string, typeof indexRows>>();
    
    for (const row of indexRows) {
      // For Excel-based data, extract dimension and segment from groupB
      let dimension: string;
      let segment: string;
      
      if (row.groupB && (
        row.groupB.toLowerCase().includes('byggt') ||
        row.groupB.toLowerCase().includes('förvaltar') ||
        row.groupB.toLowerCase().includes('information')
      )) {
        // This is Excel-based data - extract dimension and segment from groupB
        const groupB = row.groupB.toLowerCase();
        if (groupB.includes('byggt')) {
          dimension = 'Riksbyggen byggt';
          segment = row.groupC || 'Unknown';
        } else if (groupB.includes('förvaltar')) {
          dimension = 'Riksbyggen förvaltar';
          segment = row.groupC || 'Unknown';
        } else if (groupB.includes('information')) {
          dimension = 'Hittade informationen';
          segment = row.groupC || 'Unknown';
        } else {
          dimension = row.groupB;
          segment = row.groupC || 'Unknown';
        }
      } else {
        // Regular demographic data
        dimension = row.groupB || 'Unknown';
        segment = row.groupC || 'Unknown';
      }
      
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
        else if (dimensionLower.includes('byggt')) {
          const yesRows = segmentMap.get('Ja') || segmentMap.get('Yes') || [];
          const noRows = segmentMap.get('Nej') || segmentMap.get('No') || [];

          breakdown.riksbyggenBuilt.yes = calculateSegmentAverage(yesRows);
          breakdown.riksbyggenBuilt.no = calculateSegmentAverage(noRows);
          breakdown.riksbyggenBuilt.delta = calculateDelta(breakdown.riksbyggenBuilt.yes, breakdown.riksbyggenBuilt.no);
        }

        // Riksbyggen Managed breakdown - handle specific Excel column headers
        else if (dimensionLower.includes('förvaltar')) {
          const yesRows = segmentMap.get('Ja') || segmentMap.get('Yes') || [];
          const noRows = segmentMap.get('Nej') || segmentMap.get('No') || [];

          breakdown.riksbyggenManaged.yes = calculateSegmentAverage(yesRows);
          breakdown.riksbyggenManaged.no = calculateSegmentAverage(noRows);
          breakdown.riksbyggenManaged.delta = calculateDelta(breakdown.riksbyggenManaged.yes, breakdown.riksbyggenManaged.no);
        }

        // Information Found breakdown - handle specific Excel column headers
        else if (dimensionLower.includes('information')) {
          const yesRows = segmentMap.get('Ja') || segmentMap.get('Yes') || segmentMap.get('Ja/Ja, delvis') || [];
          const partiallyRows = segmentMap.get('Ja, delvis') || segmentMap.get('Yes, partially') || segmentMap.get('Delvis') || segmentMap.get('Partially') || [];
          const noRows = segmentMap.get('Nej') || segmentMap.get('No') || [];

          breakdown.informationFound.yes = calculateSegmentAverage(yesRows);
          breakdown.informationFound.partially = calculateSegmentAverage(partiallyRows);
          breakdown.informationFound.no = calculateSegmentAverage(noRows);
        }
    }

    // Add QoQ data to all segments
    const breakdownWithQoQ = await addQoQData(breakdown, period);

    return NextResponse.json(breakdownWithQoQ);
  } catch (error) {
    console.error('Error fetching demographic breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demographic breakdown' },
      { status: 500 }
    );
  }
}

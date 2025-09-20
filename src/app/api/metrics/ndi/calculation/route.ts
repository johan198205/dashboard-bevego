import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Period } from '@/types/ndi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as Period;

    if (!period) {
      return NextResponse.json({ error: 'Period parameter is required' }, { status: 400 });
    }

    // Get all NDI data for the period
    const allData = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
      },
      orderBy: [
        { source: 'asc' },
        { groupA: 'asc' },
        { groupB: 'asc' },
        { groupC: 'asc' },
      ],
    });

    // Separate aggregated and breakdown data
    const aggregated = allData.filter(d => d.source === 'AGGREGATED');
    const breakdown = allData.filter(d => d.source === 'BREAKDOWN');

    let finalValue: number;
    let calculationMethod: string;
    let source: 'AGGREGATED' | 'BREAKDOWN';

    // Process aggregated data - group by period and show individual rows
    const aggregatedRows = aggregated.map((row, index) => ({
      rowIndex: index + 1,
      value: row.value,
      label: row.groupA || `Index Row ${index + 1}`,
      originalLabel: row.groupB || 'Index'
    }));

    if (aggregated.length > 0) {
      if (aggregated.length === 1) {
        finalValue = aggregated[0].value;
        calculationMethod = 'Direkt värde från aggregerad data';
        source = 'AGGREGATED';
      } else {
        // Calculate average of all aggregated rows
        const sum = aggregated.reduce((s, row) => s + row.value, 0);
        finalValue = sum / aggregated.length;
        calculationMethod = `Snitt av ${aggregated.length} Index-rader`;
        source = 'AGGREGATED';
      }
    } else {
      // Calculate from breakdown data
      const breakdownRows = breakdown.map(row => ({
        value: row.value,
        weight: row.weight || 0,
        groupA: row.groupA || undefined,
        groupB: row.groupB || undefined,
        groupC: row.groupC || undefined,
      }));

      const hasWeights = breakdown.some(d => d.weight && d.weight > 0);
      
      if (hasWeights) {
        const numerator = breakdown.reduce((sum, d) => sum + d.value * (d.weight || 0), 0);
        const denominator = breakdown.reduce((sum, d) => sum + (d.weight || 0), 0);
        finalValue = denominator > 0 ? numerator / denominator : 0;
        calculationMethod = `Viktat medelvärde av ${breakdown.length} rader`;
      } else {
        const sum = breakdown.reduce((sum, d) => sum + d.value, 0);
        finalValue = breakdown.length > 0 ? sum / breakdown.length : 0;
        calculationMethod = `Enkelt medelvärde av ${breakdown.length} rader`;
      }
      source = 'BREAKDOWN';
    }

    // Get previous period for QoQ calculation
    const prevQuarter = getPreviousQuarter(period);
    let qoqChange: number | undefined;
    if (prevQuarter) {
      const prevData = await prisma.metricPoint.findMany({
        where: {
          period: prevQuarter,
          metric: 'NDI',
        },
      });
      
      if (prevData.length > 0) {
        const prevValue = prevData[0].value; // Simplified - should use same logic as above
        qoqChange = ((finalValue - prevValue) / prevValue) * 100;
      }
    }

    // Get previous year for YoY calculation
    const prevYearQuarter = getPreviousYearQuarter(period);
    let yoyChange: number | undefined;
    const prevYearData = await prisma.metricPoint.findMany({
      where: {
        period: prevYearQuarter,
        metric: 'NDI',
      },
    });
    
    if (prevYearData.length > 0) {
      const prevYearValue = prevYearData[0].value; // Simplified - should use same logic as above
      yoyChange = ((finalValue - prevYearValue) / prevYearValue) * 100;
    }

    return NextResponse.json({
      period,
      source,
      aggregatedRows,
      breakdownRows: breakdown.map(row => ({
        value: row.value,
        weight: row.weight || 0,
        groupA: row.groupA || undefined,
        groupB: row.groupB || undefined,
        groupC: row.groupC || undefined,
      })),
      finalValue,
      calculationMethod,
      qoqChange,
      yoyChange,
    });
  } catch (error) {
    console.error('Error fetching calculation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calculation data' },
      { status: 500 }
    );
  }
}

function getPreviousQuarter(period: Period): Period | null {
  const [year, quarter] = period.split('Q').map(Number);
  
  if (quarter === 1) {
    return `${year - 1}Q4`;
  } else {
    return `${year}Q${quarter - 1}` as Period;
  }
}

function getPreviousYearQuarter(period: Period): Period {
  const [year, quarter] = period.split('Q').map(Number);
  return `${year - 1}Q${quarter}` as Period;
}

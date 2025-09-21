import { prisma } from '@/lib/prisma';
import { Period, NDISummary, NDISeriesPoint, BreakdownRow } from '@/types/ndi';
import { qoq, yoy, getPreviousQuarter, getPreviousYearQuarter, rolling4q } from '@/lib/ndi-calculations';

export class NDIService {
  /**
   * Get NDI summary for a specific period
   */
  async getSummary(period: Period): Promise<NDISummary | null> {
    const ndiValue = await this.getNDIValue(period);
    if (ndiValue === null) return null;

    // Calculate QoQ change
    let qoqChange: number | undefined;
    let prevQuarterValue: number | undefined;
    const prevQuarter = getPreviousQuarter(period);
    if (prevQuarter) {
      const prevValue = await this.getNDIValue(prevQuarter);
      if (prevValue !== null) {
        prevQuarterValue = prevValue;
        const qoqResult = qoq(ndiValue, prevValue);
        qoqChange = qoqResult !== null ? qoqResult : undefined;
      }
    }

    // Calculate YoY change
    let yoyChange: number | undefined;
    let prevYearValue: number | undefined;
    const prevYearQuarter = getPreviousYearQuarter(period);
    const prevYearVal = await this.getNDIValue(prevYearQuarter);
    if (prevYearVal !== null) {
      prevYearValue = prevYearVal;
      const yoyResult = yoy(ndiValue, prevYearVal);
      yoyChange = yoyResult !== null ? yoyResult : undefined;
    }

    // Calculate rolling 4Q average
    const series = await this.getSeries();
    const rolling4qValue = rolling4q(series, period);

    return {
      period,
      total: ndiValue,
      qoqChange,
      yoyChange,
      prevQuarterValue,
      prevYearValue,
      rolling4q: rolling4qValue || undefined,
    };
  }

  /**
   * Get NDI time series
   */
  async getSeries(from?: Period, to?: Period): Promise<NDISeriesPoint[]> {
    const allPeriods = await prisma.metricPoint.findMany({
      where: { metric: 'NDI' },
      select: { 
        period: true, 
        value: true, 
        source: true, 
        groupA: true, 
        groupB: true, 
        groupC: true, 
        weight: true 
      },
      orderBy: { period: 'asc' },
    });

    // Group by period and calculate values
    const periodMap = new Map<string, { value: number | null; source: string }>();
    
    for (const point of allPeriods) {
      if (!periodMap.has(point.period)) {
        periodMap.set(point.period, { value: null, source: 'BREAKDOWN' });
      }
      
      const existing = periodMap.get(point.period)!;
      
      // Prefer aggregated data
      if (point.source === 'AGGREGATED' && point.groupA === null) {
        existing.value = point.value;
        existing.source = 'AGGREGATED';
      } else if (existing.source === 'BREAKDOWN' && existing.value === null) {
        // This will be calculated later
        existing.value = point.value; // Placeholder
      }
    }

    // Calculate breakdown values where needed
    for (const [period, data] of periodMap) {
      if (data.source === 'BREAKDOWN') {
        const breakdownValues = allPeriods.filter(p => 
          p.period === period && p.source === 'BREAKDOWN'
        );
        
        if (breakdownValues.length > 0) {
          const hasWeights = breakdownValues.some(v => v.weight && v.weight > 0);
          
          if (hasWeights) {
            const numerator = breakdownValues.reduce((sum, v) => sum + v.value * (v.weight || 0), 0);
            const denominator = breakdownValues.reduce((sum, v) => sum + (v.weight || 0), 0);
            data.value = denominator > 0 ? numerator / denominator : null;
          } else {
            const sum = breakdownValues.reduce((sum, v) => sum + v.value, 0);
            data.value = sum / breakdownValues.length;
          }
        }
      }
    }

    // Convert to series format
    let series: NDISeriesPoint[] = Array.from(periodMap.entries()).map(([period, data]) => ({
      period: period as Period,
      value: data.value,
    }));

    // Sort by period
    series = series.sort((a, b) => {
      const [yearA, quarterA] = a.period.split('Q').map(Number);
      const [yearB, quarterB] = b.period.split('Q').map(Number);
      
      if (yearA !== yearB) return yearA - yearB;
      return quarterA - quarterB;
    });

    // Filter by date range if specified
    if (from || to) {
      series = series.filter(point => {
        if (from && point.period < from) return false;
        if (to && point.period > to) return false;
        return true;
      });
    }

    // Calculate rolling 4Q for each point
    const seriesWithR4 = series.map(point => {
      const r4 = rolling4q(series, point.period);
      return {
        ...point,
        r4: r4 || undefined,
      };
    });

    return seriesWithR4;
  }

  /**
   * Get breakdown data for a specific period
   */
  async getBreakdown(period: Period): Promise<BreakdownRow[]> {
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

    return breakdownData.map(row => ({
      period,
      groupA: row.groupA || undefined,
      groupB: row.groupB || undefined,
      groupC: row.groupC || undefined,
      value: row.value,
      weight: row.weight || undefined,
    }));
  }

  /**
   * Get top and bottom performers for a period
   */
  async getTopBottom(period: Period, limit: number = 3): Promise<{
    top: BreakdownRow[];
    bottom: BreakdownRow[];
  }> {
    const breakdown = await this.getBreakdown(period);
    
    // Sort by value
    const sorted = [...breakdown].sort((a, b) => b.value - a.value);
    
    return {
      top: sorted.slice(0, limit),
      bottom: sorted.slice(-limit).reverse(),
    };
  }

  /**
   * Get available periods
   */
  async getAvailablePeriods(): Promise<Period[]> {
    const periods = await prisma.metricPoint.findMany({
      where: { metric: 'NDI' },
      select: { period: true },
      distinct: ['period'],
      orderBy: { period: 'desc' },
    });

    return periods.map(p => p.period as Period);
  }

  /**
   * Get the latest available period
   */
  async getLatestPeriod(): Promise<Period | null> {
    const latest = await prisma.metricPoint.findFirst({
      where: { metric: 'NDI' },
      select: { period: true },
      orderBy: { period: 'desc' },
    });

    return latest ? (latest.period as Period) : null;
  }

  /**
   * Private method to get NDI value for a period
   */
  private async getNDIValue(period: Period): Promise<number | null> {
    // Try aggregated first
    const aggregatedValue = await prisma.metricPoint.findFirst({
      where: {
        period,
        metric: 'NDI',
        source: 'AGGREGATED',
        groupA: null,
        groupB: null,
        groupC: null,
      },
    });

    if (aggregatedValue) {
      return aggregatedValue.value;
    }

    // Calculate from breakdowns
    const breakdownValues = await prisma.metricPoint.findMany({
      where: {
        period,
        metric: 'NDI',
        source: 'BREAKDOWN',
      },
    });

    if (breakdownValues.length === 0) {
      return null;
    }

    const hasWeights = breakdownValues.some(v => v.weight && v.weight > 0);
    
    if (hasWeights) {
      const numerator = breakdownValues.reduce((sum, v) => sum + v.value * (v.weight || 0), 0);
      const denominator = breakdownValues.reduce((sum, v) => sum + (v.weight || 0), 0);
      return denominator > 0 ? numerator / denominator : null;
    } else {
      const sum = breakdownValues.reduce((sum, v) => sum + v.value, 0);
      return sum / breakdownValues.length;
    }
  }
}

export const ndiService = new NDIService();

"use client";
import { useEffect, useState } from 'react';
import { useFilters } from '@/components/GlobalFilters';
import { getCwvSummary, getCwvTrends, getCwvTable } from '@/lib/mockData/cwv';
import { CwvSummary, CwvTrendPoint, CwvUrlGroupRow } from '@/lib/types';
import CwvCard from './CwvCard';
import CwvTrends from './CwvTrends';
import CwvTable from './CwvTable';

export default function CoreWebVitals() {
  const { state } = useFilters();
  const [summary, setSummary] = useState<CwvSummary | null>(null);
  const [trends, setTrends] = useState<CwvTrendPoint[]>([]);
  const [tableData, setTableData] = useState<CwvUrlGroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine device type for display
  const getDeviceLabel = () => {
    if (state.device.includes('Desktop') && !state.device.includes('Mobil')) {
      return 'Desktop p75';
    } else if (state.device.includes('Mobil') && !state.device.includes('Desktop')) {
      return 'Mobil p75';
    } else if (state.device.length === 0 || state.device.includes('Alla')) {
      return 'Mobil p75'; // Default to mobile
    } else {
      return 'Kombinerat p75'; // When both are selected
    }
  };

  const deviceLabel = getDeviceLabel();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryData, trendsData, tableDataResult] = await Promise.all([
          getCwvSummary(state.range.start, state.range.end, state.device),
          getCwvTrends(state.range.start, state.range.end, state.device),
          getCwvTable(state.range.start, state.range.end, state.device)
        ]);
        
        setSummary(summaryData);
        setTrends(trendsData);
        setTableData(tableDataResult);
      } catch (error) {
        console.error('Error loading Core Web Vitals data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [state.range.start, state.range.end, state.device]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Core Web Vitals (CrUX)
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Core Web Vitals (CrUX)
        </h2>
        <div className="card text-center py-8">
          <p className="text-gray-500">Kunde inte ladda Core Web Vitals data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Core Web Vitals (CrUX)
      </h2>
      
      {/* Scorecards */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Översikt (scorecards)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <CwvCard
            title={`LCP (${deviceLabel})`}
            value={`${summary.lcp.p75} ms`}
            target="< 2,5s"
            status={summary.lcp.status}
            description="Largest Contentful Paint"
          />
          <CwvCard
            title={`INP (${deviceLabel})`}
            value={`${summary.inp.p75} ms`}
            target="< 200ms"
            status={summary.inp.status}
            description="Interaction to Next Paint"
          />
          <CwvCard
            title={`CLS (${deviceLabel})`}
            value={summary.cls.p75.toString()}
            target="< 0,1"
            status={summary.cls.status}
            description="Cumulative Layout Shift"
          />
          <CwvCard
            title="Andel passerade sidor"
            value={`${summary.passedPages.percentage}%`}
            target="> 75%"
            status={summary.passedPages.percentage >= 75 ? 'Pass' : 'Needs Improvement'}
            description={`${summary.passedPages.count} sidor`}
          />
          <CwvCard
            title="CWV total status"
            value={`${summary.totalStatus.percentage}%`}
            target="> 75%"
            status={summary.totalStatus.percentage >= 75 ? 'Pass' : 'Needs Improvement'}
            description="Klarar alla tre"
          />
        </div>
      </div>

      {/* Trends */}
      <CwvTrends data={trends} />

      {/* Table */}
      <CwvTable data={tableData} />
    </div>
  );
}

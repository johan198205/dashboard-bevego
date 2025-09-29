"use client";
import { useEffect, useState } from 'react';
import { useFilters } from '@/components/GlobalFilters';
import { getCruxSummary, getCruxTrends } from '@/services/crux-data.service';
import { CwvSummary, CwvTrendPoint } from '@/lib/types';
import CwvCard from './CwvCard';
import CwvTrends from './CwvTrends';
import TopPagesTable from './TopPagesTable';
import PrestandaFilters from '@/components/PrestandaFilters';

export default function CoreWebVitals() {
  const { state } = useFilters();
  const [summary, setSummary] = useState<CwvSummary | null>(null);
  const [trends, setTrends] = useState<CwvTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine device type for display
  const getDeviceLabel = () => {
    if (state.device.includes('Desktop') && !state.device.includes('Mobil') && !state.device.includes('Alla')) {
      return 'Desktop p75';
    } else if (state.device.includes('Mobil') && !state.device.includes('Desktop') && !state.device.includes('Alla')) {
      return 'Mobil p75';
    } else if (state.device.includes('Surfplatta') && !state.device.includes('Desktop') && !state.device.includes('Mobil') && !state.device.includes('Alla')) {
      return 'Surfplatta p75';
    } else if (state.device.length === 0 || state.device.includes('Alla')) {
      return 'Kombinerat p75'; // Combined view when "Alla" or no device selected
    } else {
      return 'Kombinerat p75'; // When multiple devices are selected
    }
  };

  const deviceLabel = getDeviceLabel();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, trendsData] = await Promise.all([
          getCruxSummary(state.range, state.device),
          getCruxTrends(state.range, state.device)
        ]);
        setSummary(summaryData);
        setTrends(trendsData);
      } catch (error) {
        console.error('Error loading Core Web Vitals data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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

  if (error || !summary) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Core Web Vitals (CrUX)
        </h2>
        <div className="card text-center py-8">
          <p className="text-gray-500">
            {error === 'No field data available' 
              ? 'No field data available for this origin in CrUX database'
              : error || 'Kunde inte ladda Core Web Vitals data'
            }
          </p>
          {error === 'No field data available' && (
            <p className="text-sm text-gray-400 mt-2">
              This may be because the site is new or has insufficient traffic for CrUX measurement.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Core Web Vitals (CrUX)
        </h2>
        {summary?.period && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Data från: {summary.period}
          </div>
        )}
      </div>
      
      {/* Prestanda-specific filters */}
      <PrestandaFilters />
      
      {/* Scorecards */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Översikt (scorecards)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            title={`TTFB (${deviceLabel})`}
            value={`${summary.ttfb.p75} ms`}
            target="< 800ms"
            status={summary.ttfb.status}
            description="Time to First Byte"
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

      {/* Top Pages Table */}
      <TopPagesTable device={state.device} />
    </div>
  );
}

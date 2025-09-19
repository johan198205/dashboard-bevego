"use client";

import { useState, useEffect } from "react";
import { NDICard } from "@/components/NDI/NDICard";
import { NDIChart } from "@/components/NDI/NDIChart";
import { NDISummaryTable } from "@/components/NDI/NDISummaryTable";
import { NDITopBottom } from "@/components/NDI/NDITopBottom";
import { NDISummary, NDISeriesPoint, BreakdownRow } from "@/types/ndi";

export default function NDIPage() {
  const [summary, setSummary] = useState<NDISummary | null>(null);
  const [series, setSeries] = useState<NDISeriesPoint[]>([]);
  const [topBottom, setTopBottom] = useState<{ top: BreakdownRow[]; bottom: BreakdownRow[] }>({ top: [], bottom: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get latest period
      const latestPeriodResponse = await fetch('/api/metrics/ndi/latest-period');
      const latestPeriod = await latestPeriodResponse.json();

      if (!latestPeriod) {
        setError('Ingen data tillgänglig. Ladda upp filer först.');
        return;
      }

      // Fetch summary for latest period
      const summaryResponse = await fetch(`/api/metrics/ndi/summary?period=${latestPeriod}`);
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);

      // Fetch series data
      const seriesResponse = await fetch('/api/metrics/ndi/series');
      const seriesData = await seriesResponse.json();
      setSeries(seriesData);

      // Fetch top/bottom performers
      const breakdownResponse = await fetch(`/api/metrics/ndi/breakdown?period=${latestPeriod}`);
      const breakdownData = await breakdownResponse.json();
      
      // Calculate top/bottom
      const sorted = [...breakdownData].sort((a, b) => b.value - a.value);
      setTopBottom({
        top: sorted.slice(0, 3),
        bottom: sorted.slice(-3).reverse()
      });

    } catch (error) {
      console.error('Error fetching NDI data:', error);
      setError('Ett fel uppstod vid hämtning av data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-2xl p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
          {error}
        </h3>
        <p className="text-dark-6 dark:text-dark-4 mb-4">
          Gå till inställningar för att ladda upp Excel-filer
        </p>
        <a
          href="/ndi/settings"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Gå till inställningar
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          NDI Dashboard
        </h1>
        <p className="text-dark-6 dark:text-dark-4 mt-1">
          Översikt över Net Promoter Index och kundnöjdhet
        </p>
      </div>

      {/* Scorecards */}
      {summary && <NDICard data={summary} />}

      {/* Chart */}
      <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">
          NDI över tid
        </h2>
        <NDIChart data={series} />
      </div>

      {/* Summary Table */}
      <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">
          Sammanfattning per kvartal
        </h2>
        <NDISummaryTable data={series} />
      </div>

      {/* Top/Bottom Performers */}
      {topBottom.top.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">
            Bästa och sämsta prestanda
          </h2>
          <NDITopBottom top={topBottom.top} bottom={topBottom.bottom} />
        </div>
      )}
    </div>
  );
}

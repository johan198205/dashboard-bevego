"use client";

import { useState, useEffect } from "react";
import { NDIBreakdownHeatmap } from "@/components/NDI/NDIBreakdownHeatmap";
import { PeriodSelect } from "@/components/NDI/PeriodSelect";
import { BreakdownRow, Period } from "@/types/ndi";

export default function NDIDetailsPage() {
  // Sidan avpublicerad: omdirigera till /ndi
  if (typeof window !== 'undefined') {
    window.location.replace('/ndi');
  }
  const [selectedPeriod, setSelectedPeriod] = useState<Period | undefined>();
  const [breakdownData, setBreakdownData] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBreakdownData = async (period: Period) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/metrics/ndi/breakdown?period=${period}`);
      const data = await response.json();
      setBreakdownData(data);
    } catch (error) {
      console.error('Error fetching breakdown data:', error);
      setError('Ett fel uppstod vid hämtning av data');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    fetchBreakdownData(period);
  };

  // Auto-select latest period on mount
  useEffect(() => {
    const fetchLatestPeriod = async () => {
      try {
        const response = await fetch('/api/metrics/ndi/latest-period');
        const latestPeriod = await response.json();
        if (latestPeriod) {
          setSelectedPeriod(latestPeriod);
          fetchBreakdownData(latestPeriod);
        }
      } catch (error) {
        console.error('Error fetching latest period:', error);
      }
    };

    fetchLatestPeriod();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          NDI Detaljer
        </h1>
        <p className="text-dark-6 dark:text-dark-4 mt-1">
          Detaljerad analys per kategori och period
        </p>
      </div>

      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-dark dark:text-white">
            Välj period:
          </label>
          <div className="w-48">
            <PeriodSelect
              value={selectedPeriod}
              onChange={handlePeriodChange}
            />
          </div>
        </div>
      </div>

      {/* Breakdown Heatmap */}
      {selectedPeriod && (
        <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              NDI Heatmap - {selectedPeriod.replace('Q', ' Q')}
            </h2>
            {loading && (
              <div className="text-sm text-dark-6 dark:text-dark-4">
                Laddar...
              </div>
            )}
          </div>

          {error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                {error}
              </h3>
            </div>
          ) : breakdownData.length > 0 ? (
            <NDIBreakdownHeatmap data={breakdownData} />
          ) : !loading ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                Ingen data tillgänglig
              </h3>
              <p className="text-dark-6 dark:text-dark-4">
                Inga nedbrytningar hittades för den valda perioden
              </p>
            </div>
          ) : null}
        </div>
      )}

      {!selectedPeriod && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
            Välj en period
          </h3>
          <p className="text-dark-6 dark:text-dark-4">
            Välj en period ovan för att visa detaljerad analys
          </p>
        </div>
      )}
    </div>
  );
}

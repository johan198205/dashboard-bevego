"use client";

import { useState, useEffect } from 'react';
import { XIcon, TrendingUpIcon, ArrowDownIcon } from '@/assets/icons';
import { Period } from '@/types/ndi';

interface CalculationData {
  period: string;
  source: 'AGGREGATED' | 'BREAKDOWN';
  aggregatedRows: Array<{
    rowIndex: number;
    value: number;
    label: string;
    originalLabel?: string;
  }>;
  breakdownRows: Array<{
    value: number;
    weight: number;
    groupA?: string;
    groupB?: string;
    groupC?: string;
  }>;
  finalValue: number;
  calculationMethod: string;
  qoqChange?: number;
  yoyChange?: number;
}

interface NDICalculationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  period: Period;
}

export function NDICalculationSidebar({ isOpen, onClose, period }: NDICalculationSidebarProps) {
  const [data, setData] = useState<CalculationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && period) {
      fetchCalculationData();
    }
  }, [isOpen, period]);

  const fetchCalculationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/metrics/ndi/calculation?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch calculation data');
      }
      
      const calculationData = await response.json();
      setData(calculationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-dark shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stroke dark:border-dark-3 p-4">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                NDI Beräkning
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {data && (
              <div className="space-y-6">
                {/* Period Info */}
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                  <h3 className="font-semibold text-dark dark:text-white mb-2">
                    Period: {data.period}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Datakälla:
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      data.source === 'AGGREGATED' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {data.source}
                    </span>
                  </div>
                </div>

                {/* Final Result */}
                <div className="rounded-lg bg-primary/10 p-4">
                  <h3 className="font-semibold text-dark dark:text-white mb-2">
                    Slutresultat
                  </h3>
                  <div className="text-3xl font-bold text-primary">
                    {data.finalValue.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {data.calculationMethod}
                  </p>
                </div>

                {/* Aggregated Data */}
                {data.aggregatedRows.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-dark dark:text-white mb-3">
                      Aggregerade rader ({data.aggregatedRows.length})
                    </h3>
                    <div className="space-y-2">
                      {data.aggregatedRows.map((row, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                          <div>
                            <div className="font-medium text-dark dark:text-white">
                              {row.label}
                            </div>
                            {row.originalLabel && row.originalLabel !== row.label && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Original: {row.originalLabel}
                              </div>
                            )}
                          </div>
                          <div className="text-lg font-semibold text-primary">
                            {row.value.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {data.aggregatedRows.length > 1 && (
                      <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                        <div className="text-sm text-blue-800 dark:text-blue-400">
                          <strong>Snitt:</strong> {data.aggregatedRows.reduce((sum, row) => sum + row.value, 0) / data.aggregatedRows.length} / {data.aggregatedRows.length} = {data.finalValue.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                )}


              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

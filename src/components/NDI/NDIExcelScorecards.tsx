"use client";

import { DemographicBreakdown, DemographicSegment } from '@/types/ndi';

interface NDIExcelScorecardsProps {
  data: DemographicBreakdown | null;
  loading?: boolean;
}

interface ScorecardChipProps {
  label: string;
  segment: DemographicSegment;
  showCount?: boolean;
}

function ScorecardChip({ label, segment, showCount = false }: ScorecardChipProps) {
  const displayValue = segment.ndi !== null ? segment.ndi.toFixed(2) : 'N/A';

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <span className="text-sm font-medium text-dark dark:text-white">{label}</span>
      <div className="text-right">
        <span className="text-lg font-semibold text-dark dark:text-white">
          {displayValue}
        </span>
        {showCount && (
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            {segment.count || 0} svar
          </div>
        )}
      </div>
    </div>
  );
}

interface DeltaChipProps {
  label: string;
  delta: number | null;
}

function DeltaChip({ label, delta }: DeltaChipProps) {
  if (delta === null) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
        <span className="text-sm font-medium text-dark dark:text-white">{label}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">N/A</span>
      </div>
    );
  }

  const isDeltaPositive = delta > 0;
  const deltaColor = isDeltaPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const deltaBg = isDeltaPositive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';

  return (
    <div className={`flex items-center justify-between p-3 ${deltaBg} rounded-lg`}>
      <span className="text-sm font-medium text-dark dark:text-white">{label}</span>
      <div className="flex items-center space-x-1">
        <span className={`text-sm font-bold ${deltaColor}`}>
          {isDeltaPositive ? '+' : ''}{delta.toFixed(2)} p.p.
        </span>
      </div>
    </div>
  );
}

interface ScorecardProps {
  title: string;
  children: React.ReactNode;
}

function Scorecard({ title, children }: ScorecardProps) {
  return (
    <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-dark dark:text-white mb-4">{title}</h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

export function NDIExcelScorecards({ data, loading }: NDIExcelScorecardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-2xl p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="space-y-2">
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
            Ingen Excel-baserad data
          </h3>
          <p className="text-dark-6 dark:text-dark-4">
            Excel-baserade uppdelningar är inte tillgängliga för detta kvartal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Riksbyggen Built Scorecard */}
      <Scorecard title="Riksbyggen byggt">
        <ScorecardChip label="Ja" segment={data.riksbyggenBuilt.yes} showCount />
        <ScorecardChip label="Nej" segment={data.riksbyggenBuilt.no} showCount />
        <DeltaChip label="Diff (Ja–Nej)" delta={data.riksbyggenBuilt.delta} />
      </Scorecard>

      {/* Riksbyggen Managed Scorecard */}
      <Scorecard title="Riksbyggen förvaltar">
        <ScorecardChip label="Ja" segment={data.riksbyggenManaged.yes} showCount />
        <ScorecardChip label="Nej" segment={data.riksbyggenManaged.no} showCount />
        <DeltaChip label="Diff (Ja–Nej)" delta={data.riksbyggenManaged.delta} />
      </Scorecard>

      {/* Information Found Scorecard */}
      <Scorecard title="Hittade informationen">
        <ScorecardChip label="Ja" segment={data.informationFound.yes} showCount />
        <ScorecardChip label="Ja, delvis" segment={data.informationFound.partially} showCount />
        <ScorecardChip label="Nej" segment={data.informationFound.no} showCount />
      </Scorecard>
    </div>
  );
}

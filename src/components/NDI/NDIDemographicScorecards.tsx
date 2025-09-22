"use client";

import { DemographicBreakdown, DemographicSegment } from '@/types/ndi';
import { TrendingUpIcon, ArrowDownIcon, UserIcon, GlobeIcon, CallIcon } from "@/assets/icons";

interface NDIDemographicScorecardsProps {
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
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-[5px] transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-sm">
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
        {/* QoQ Change */}
        {segment.qoqChange !== null && segment.qoqChange !== undefined && (
          <div className={`text-xs font-medium ${
            segment.qoqChange > 0 
              ? 'text-green-600 dark:text-green-400' 
              : segment.qoqChange < 0 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-600 dark:text-gray-400'
          }`}>
            {segment.qoqChange > 0 ? '+' : ''}{segment.qoqChange.toFixed(2)}%
            {segment.prevQuarterValue !== null && segment.prevQuarterValue !== undefined && (
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                ({segment.prevQuarterValue.toFixed(2)})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DeltaChipProps {
  label: string;
  delta: number | null;
  isPositive?: boolean;
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
  icon: React.ComponentType<any>;
}

function Scorecard({ title, children, icon: Icon }: ScorecardProps) {
  return (
    <div className="relative overflow-hidden rounded-[5px] bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3 p-6 transition-transform transition-shadow duration-200 ease-out will-change-transform motion-reduce:transition-none motion-reduce:transform-none hover:shadow-md hover:border-primary/30 motion-reduce:hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:scale-[1.01] focus-visible:scale-[1.01] motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100">
      {/* Icon */}
      <div className="absolute top-6 right-6 bg-red/10 rounded-lg p-2 mb-8">
        <Icon className="h-5 w-5 text-red" />
      </div>
      
      <h3 className="text-sm font-semibold text-dark dark:text-white mb-6 pr-16">{title}</h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

export function NDIDemographicScorecards({ data, loading }: NDIDemographicScorecardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-2xl p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="space-y-2">
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
            Ingen demografisk data
          </h3>
          <p className="text-dark-6 dark:text-dark-4">
            Demografiska uppdelningar är inte tillgängliga för detta kvartal
          </p>
        </div>
      </div>
    );
  }

  // Age groups mapping - TODO(config): move to constants
  const ageGroupLabels: Record<string, string> = {
    '18-25': '18-25',
    '26-35': '26-35', 
    '36-45': '36-45',
    '46-55': '46-55',
    '56-65': '56-65',
    '65+': '65+',
    '-25': 'Under 25',
    '25-35': '25-35',
    '35-45': '35-45',
    '45-55': '45-55',
    '55-65': '55-65',
  };

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Gender Scorecard */}
      <Scorecard title="Kön" icon={UserIcon}>
        <ScorecardChip label="Män" segment={data.gender.male} showCount />
        <ScorecardChip label="Kvinnor" segment={data.gender.female} showCount />
      </Scorecard>

      {/* Age Groups Scorecard */}
      <Scorecard title="Åldersgrupper" icon={TrendingUpIcon}>
        {Object.entries(data.ageGroups)
          .sort(([a], [b]) => {
            // Sort by age order
            const ageOrder = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+', '-25', '25-35', '35-45', '45-55', '55-65'];
            return ageOrder.indexOf(a) - ageOrder.indexOf(b);
          })
          .map(([ageGroup, segment]) => (
            <ScorecardChip
              key={ageGroup}
              label={ageGroupLabels[ageGroup] || ageGroup}
              segment={segment}
              showCount
            />
          ))}
      </Scorecard>

      {/* Device Scorecard */}
      <Scorecard title="Enhet" icon={CallIcon}>
        <ScorecardChip label="Mobile" segment={data.device.mobile} showCount />
        <ScorecardChip label="Desktop" segment={data.device.desktop} showCount />
      </Scorecard>

      {/* OS Scorecard */}
      <Scorecard title="Operativsystem" icon={ArrowDownIcon}>
        <ScorecardChip label="Android" segment={data.os.android} showCount />
        <ScorecardChip label="iOS" segment={data.os.ios} showCount />
      </Scorecard>

      {/* Browser Scorecard */}
      <Scorecard title="Webbläsare" icon={GlobeIcon}>
        <ScorecardChip label="Chrome" segment={data.browser.chrome} showCount />
        <ScorecardChip label="Safari" segment={data.browser.safari} showCount />
        <ScorecardChip label="Edge" segment={data.browser.edge} showCount />
      </Scorecard>
    </div>
  );
}

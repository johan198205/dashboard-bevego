"use client";

import { ScoreCard } from "@/components/ui/scorecard";
import { NDISummary, Period } from "@/types/ndi";
import { TrendingUpIcon, ArrowDownIcon } from "@/assets/icons";

interface NDICardProps {
  data: NDISummary;
  className?: string;
}

export function NDICard({ data, className }: NDICardProps) {

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(1);
  };

  const formatChange = (change: number | null | undefined) => {
    if (change === null || change === undefined) return 'N/A';
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
  };
  const formatQuarterLabel = (period: Period) => {
    const match = period.match(/^(\d{4})Q([1-4])$/);
    if (match) {
      const year = match[1];
      const quarter = match[2];
      return `NDI - Q${quarter} ${year}`;
    }
    return 'NDI';
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Main NDI Score with QoQ and YoY */}
      <div 
        className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-[5px] p-6 relative overflow-hidden hover:border-red hover:shadow-lg transition-all"
      >
        
        {/* Icon */}
        <div className="absolute top-6 right-6 bg-red/10 rounded-lg p-2">
          <TrendingUpIcon className="h-5 w-5 text-red" />
        </div>
        
        {/* Content */}
        <div className="pr-16">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {formatQuarterLabel(data.period)}
          </h3>
          
          <div className="text-4xl font-semibold text-neutral-900 dark:text-white leading-none mb-2">
            {formatValue(data.total)}
          </div>
          
          {/* Total Responses */}
          {data.totalResponses && (
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-3">
              {data.totalResponses.toLocaleString()} svar
            </div>
          )}
          
          {/* QoQ Change */}
          {data.qoqChange !== null && data.qoqChange !== undefined && (
            <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium border mb-2 ${
              data.qoqChange > 0 
                ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
            }`}>
              {data.qoqChange > 0 ? (
                <TrendingUpIcon className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
              )}
              {Math.abs(data.qoqChange).toFixed(2)}%
              {data.prevQuarterValue !== undefined && data.prevQuarterValue !== null && (
                <span className="text-neutral-600 dark:text-dark-5 ml-1">
                  ({data.prevQuarterValue.toFixed(1)}) vs. föregående kvartal
                </span>
              )}
              {(!data.prevQuarterValue || data.prevQuarterValue === null) && (
                <span className="text-neutral-600 dark:text-dark-5 ml-1">
                  vs. föregående kvartal
                </span>
              )}
            </div>
          )}
          
          {/* YoY Change */}
          {data.yoyChange !== null && data.yoyChange !== undefined && (
            <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium border ml-2 ${
              data.yoyChange > 0 
                ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
            }`}>
              {data.yoyChange > 0 ? (
                <TrendingUpIcon className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
              )}
              {Math.abs(data.yoyChange).toFixed(1)}%
              {data.prevYearValue !== undefined && data.prevYearValue !== null && (
                <span className="text-neutral-600 dark:text-dark-5 ml-1">
                  ({data.prevYearValue.toFixed(1)}) vs. föregående år
                </span>
              )}
              {(!data.prevYearValue || data.prevYearValue === null) && (
                <span className="text-neutral-600 dark:text-dark-5 ml-1">
                  vs. föregående år
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rolling 4Q */}
      <ScoreCard
        label="NDI - Rullande 4Q"
        value={data.rolling4q ? formatValue(data.rolling4q) : 'N/A'}
        Icon={TrendingUpIcon}
        variant="success"
        className={className}
      />
    </div>

    </>
  );
}

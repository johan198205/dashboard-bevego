"use client";

import { useState } from "react";
import { BreakdownWithHistory } from "@/types/ndi";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

interface NDICompleteListProps {
  data: BreakdownWithHistory[];
  className?: string;
}

export function NDICompleteList({ data, className }: NDICompleteListProps) {
  const [showAll, setShowAll] = useState(false);
  
  // TODO(config): Get initial display count from UI settings
  const INITIAL_DISPLAY_COUNT = 10;
  
  // Sort data by NDI value (highest to lowest)
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  // Remove bucket colors - we'll use change-based colors instead

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(1);
  };

  const formatChange = (change: number | null | undefined, previousValue?: number) => {
    if (change === null || change === undefined) return 'N/A';
    
    const percentStr = formatPercent(change);
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '';
    const colorClass = change > 0 ? 'text-green-600 dark:text-green-400' : change < 0 ? 'text-red-600 dark:text-red-400' : 'text-dark dark:text-white';
    
    if (previousValue !== undefined && previousValue !== null) {
      return {
        text: `${arrow}${percentStr} (${previousValue.toFixed(1)})`,
        colorClass
      };
    }
    return {
      text: `${arrow}${percentStr}`,
      colorClass
    };
  };

  const getCategoryName = (row: BreakdownWithHistory) => {
    // Use the same logic as sidebar - groupA contains the descriptive label
    return row.groupA || row.groupB || row.groupC || 'Okänd kategori';
  };

  const displayData = showAll ? sortedData : sortedData.slice(0, INITIAL_DISPLAY_COUNT);

  return (
    <div className={cn("bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          Alla områden sorterade på NDI
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {showAll ? 'Visa färre' : 'Visa alla'}
        </button>
      </div>

      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-white dark:bg-gray-dark [&_tr]:border-b [&_tr]:border-stroke dark:[&_tr]:border-dark-3">
            <tr>
              <th className="h-12 px-4 text-left align-middle font-semibold text-dark dark:text-white">
                Område
              </th>
              <th className="h-12 px-4 text-right align-middle font-semibold text-dark dark:text-white">
                NDI
              </th>
              <th className="h-12 px-4 text-right align-middle font-semibold text-dark dark:text-white">
                QoQ Δ%
              </th>
              <th className="h-12 px-4 text-right align-middle font-semibold text-dark dark:text-white">
                YoY Δ%
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {displayData.map((row, index) => {
              const qoqFormatted = formatChange(row.qoqChange, row.prevQuarterValue);
              const yoyFormatted = formatChange(row.yoyChange, row.prevYearValue);
              
              return (
                <tr 
                  key={index} 
                  className="border-b border-stroke/60 transition-colors hover:bg-neutral-50/80 data-[state=selected]:bg-neutral-100 dark:border-dark-3/60 dark:hover:bg-dark-2/80 dark:data-[state=selected]:bg-neutral-800/80 even:bg-neutral-50/20 dark:even:bg-dark-2/20"
                >
                  <td className="p-4 align-middle">
                    <div className="font-medium text-dark dark:text-white">
                      {getCategoryName(row)}
                    </div>
                  </td>
                  <td className="p-4 text-right align-middle">
                    <div className="font-semibold text-dark dark:text-white">
                      {formatValue(row.value)}
                    </div>
                  </td>
                  <td className="p-4 text-right align-middle">
                    <div className={cn("", qoqFormatted.colorClass || 'text-dark dark:text-white')}>
                      {typeof qoqFormatted === 'string' ? qoqFormatted : qoqFormatted.text}
                    </div>
                  </td>
                  <td className="p-4 text-right align-middle">
                    <div className={cn("", yoyFormatted.colorClass || 'text-dark dark:text-white')}>
                      {typeof yoyFormatted === 'string' ? yoyFormatted : yoyFormatted.text}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!showAll && sortedData.length > INITIAL_DISPLAY_COUNT && (
        <div className="mt-4 text-center text-sm text-dark-6 dark:text-dark-4">
          Visar {INITIAL_DISPLAY_COUNT} av {sortedData.length} områden
        </div>
      )}
    </div>
  );
}

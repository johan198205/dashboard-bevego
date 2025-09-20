"use client";

import { BreakdownRow } from "@/types/ndi";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon } from "@/assets/icons";

interface NDITopBottomProps {
  top: BreakdownRow[];
  bottom: BreakdownRow[];
  className?: string;
}

export function NDITopBottom({ top, bottom, className }: NDITopBottomProps) {
  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(1);
  };

  const getCategoryName = (row: BreakdownRow) => {
    // Use the same logic as sidebar - groupA contains the descriptive label
    return row.groupA || row.groupB || row.groupC || 'Okänd kategori';
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
      {/* Top Performers */}
      <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <ArrowUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            Bästa prestanda
          </h3>
        </div>
        
        <div className="space-y-3">
          {top.map((row, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-dark dark:text-white">
                  {getCategoryName(row)}
                </div>
                {row.weight && (
                  <div className="text-sm text-dark-6 dark:text-dark-4">
                    {row.weight.toLocaleString('sv-SE')} svar
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatValue(row.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Performers */}
      <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <ArrowDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            Sämsta prestanda
          </h3>
        </div>
        
        <div className="space-y-3">
          {bottom.map((row, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-dark dark:text-white">
                  {getCategoryName(row)}
                </div>
                {row.weight && (
                  <div className="text-sm text-dark-6 dark:text-dark-4">
                    {row.weight.toLocaleString('sv-SE')} svar
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatValue(row.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

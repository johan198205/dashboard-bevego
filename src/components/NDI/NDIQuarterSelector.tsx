"use client";

import { useState, useEffect } from "react";
import { Period } from "@/types/ndi";

interface NDIQuarterSelectorProps {
  selectedQuarter: Period | null;
  onQuarterChange: (quarter: Period | null) => void;
}

export function NDIQuarterSelector({ selectedQuarter, onQuarterChange }: NDIQuarterSelectorProps) {
  const [availableQuarters, setAvailableQuarters] = useState<Period[]>([]);

  useEffect(() => {
    const fetchAvailableQuarters = async () => {
      try {
        const response = await fetch('/api/metrics/ndi/series');
        if (response.ok) {
          const data = await response.json();
          const quarters = data.map((item: any) => item.period).filter(Boolean);
          setAvailableQuarters(quarters);
          
          // Set default to latest quarter if none selected
          if (!selectedQuarter && quarters.length > 0) {
            onQuarterChange(quarters[quarters.length - 1]);
          }
        }
      } catch (error) {
        console.error('Error fetching available quarters:', error);
      }
    };

    fetchAvailableQuarters();
  }, [selectedQuarter, onQuarterChange]);

  const formatQuarter = (quarter: Period) => {
    return quarter.replace('Q', ' Q');
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <select
          id="quarter-select"
          value={selectedQuarter || ''}
          onChange={(e) => onQuarterChange(e.target.value as Period || null)}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 cursor-pointer min-w-[120px]"
        >
          <option value="">Kvartal Alla</option>
          {availableQuarters.map((quarter) => (
            <option key={quarter} value={quarter}>
              {formatQuarter(quarter)}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

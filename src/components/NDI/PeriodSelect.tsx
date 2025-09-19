"use client";

import { useState, useEffect } from "react";
import { Period } from "@/types/ndi";
import { cn } from "@/lib/utils";

interface PeriodSelectProps {
  value?: Period;
  onChange: (period: Period) => void;
  className?: string;
}

export function PeriodSelect({ value, onChange, className }: PeriodSelectProps) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPeriods = async () => {
    try {
      // This would typically come from an API endpoint
      // For now, we'll generate some sample periods
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
      
      const samplePeriods: Period[] = [];
      for (let year = currentYear - 2; year <= currentYear; year++) {
        for (let quarter = 1; quarter <= 4; quarter++) {
          if (year === currentYear && quarter > currentQuarter) break;
          samplePeriods.push(`${year}Q${quarter}` as Period);
        }
      }
      
      setPeriods(samplePeriods.reverse()); // Most recent first
    } catch (error) {
      console.error('Error fetching periods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const formatPeriod = (period: Period) => {
    return period.replace('Q', ' Q');
  };

  if (loading) {
    return (
      <div className={cn("relative", className)}>
        <select
          disabled
          className="w-full px-3 py-2 border border-stroke dark:border-dark-3 rounded-lg bg-white dark:bg-gray-dark text-dark dark:text-white"
        >
          <option>Laddar perioder...</option>
        </select>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value as Period)}
        className="w-full px-3 py-2 border border-stroke dark:border-dark-3 rounded-lg bg-white dark:bg-gray-dark text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="">Välj period</option>
        {periods.map((period) => (
          <option key={period} value={period}>
            {formatPeriod(period)}
          </option>
        ))}
      </select>
    </div>
  );
}

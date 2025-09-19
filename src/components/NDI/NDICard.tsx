"use client";

import { useState } from "react";
import { ScoreCard } from "@/components/ui/scorecard";
import { NDISummary, Period } from "@/types/ndi";
import { TrendingUpIcon, ArrowDownIcon } from "@/assets/icons";
import { NDICalculationSidebar } from "./NDICalculationSidebar";

interface NDICardProps {
  data: NDISummary;
  className?: string;
}

export function NDICard({ data, className }: NDICardProps) {
  const [showCalculation, setShowCalculation] = useState(false);

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(1);
  };

  const formatChange = (change: number | null | undefined) => {
    if (change === null || change === undefined) return 'N/A';
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Main NDI Score */}
      <ScoreCard
        label="NDI - Senaste kvartal"
        value={formatValue(data.total)}
        growthRate={data.qoqChange}
        comparisonLabel="vs. föregående kvartal"
        Icon={data.qoqChange && data.qoqChange > 0 ? TrendingUpIcon : ArrowDownIcon}
        variant="primary"
        className={className}
        onClick={() => setShowCalculation(true)}
      />

      {/* QoQ Change */}
      <ScoreCard
        label="Förändring QoQ"
        value={data.qoqChange ? `${formatChange(data.qoqChange)}%` : 'N/A'}
        Icon={TrendingUpIcon}
        variant="info"
        className={className}
      />

      {/* YoY Change */}
      <ScoreCard
        label="Förändring YoY"
        value={data.yoyChange ? `${formatChange(data.yoyChange)}%` : 'N/A'}
        Icon={TrendingUpIcon}
        variant="info"
        className={className}
      />

      {/* Rolling 4Q */}
      <ScoreCard
        label="NDI - Rullande 4Q"
        value={data.rolling4q ? formatValue(data.rolling4q) : 'N/A'}
        Icon={TrendingUpIcon}
        variant="success"
        className={className}
      />
    </div>

    {/* Calculation Sidebar */}
    <NDICalculationSidebar
      isOpen={showCalculation}
      onClose={() => setShowCalculation(false)}
      period={data.period}
    />
    </>
  );
}

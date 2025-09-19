"use client";

import { ScoreCard } from "@/components/ui/scorecard";
import { NDISummary } from "@/types/ndi";
import { TrendingUpIcon, ArrowDownIcon } from "@/assets/icons";

interface NDICardProps {
  data: NDISummary;
  className?: string;
}

export function NDICard({ data, className }: NDICardProps) {
  const formatValue = (value: number) => {
    return value.toFixed(1);
  };

  const formatChange = (change: number) => {
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
  };

  return (
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
  );
}

'use client';

import { ScoreCard } from '@/components/ui/scorecard';
import { Users, MousePointer, TrendingUp, Clock } from 'lucide-react';
import { formatNumber, formatPercent, formatTime } from '@/utils/format';
import type { Summary } from '@/app/api/ga4/overview/route';

type Props = {
  data: Summary;
};

export function KpiCards({ data }: Props) {
  const kpis = [
    {
      title: 'Sessions',
      value: data.sessions,
      delta: data.deltasYoY?.sessions,
      icon: Users,
      description: 'Antal besökssessioner',
    },
    {
      title: 'Engagerade sessioner',
      value: data.engagedSessions,
      delta: data.deltasYoY?.engagedSessions,
      icon: MousePointer,
      description: 'Sessioner med engagemang (≥10s eller ≥2 sidvisningar)',
    },
    {
      title: 'Engagemangsgrad',
      value: data.engagementRatePct,
      delta: data.deltasYoY?.engagementRatePct,
      icon: TrendingUp,
      description: 'Procent engagerade sessioner',
      isPercentage: true,
    },
    {
      title: 'Genomsnittlig engagemangstid',
      value: data.avgEngagementTimeSec,
      delta: data.deltasYoY?.avgEngagementTimePct,
      icon: Clock,
      description: 'Genomsnittlig tid per session',
      isTime: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const displayValue = kpi.isTime
          ? formatTime(kpi.value)
          : kpi.isPercentage
          ? formatPercent(kpi.value)
          : formatNumber(kpi.value);

        return (
          <ScoreCard
            key={kpi.title}
            label={kpi.title}
            value={displayValue}
            growthRate={kpi.delta ?? undefined}
            Icon={Icon}
            source="GA4 Data API"
            comparisonLabel="vs föregående år"
          />
        );
      })}
    </div>
  );
}

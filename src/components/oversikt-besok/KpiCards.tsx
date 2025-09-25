'use client';

import { ScoreCard } from '@/components/ui/scorecard';
import { Users, MousePointer, TrendingUp, Clock, UserCheck, Eye } from 'lucide-react';
import { formatNumber, formatPercent, formatTime } from '@/utils/format';
import type { Summary } from '@/app/api/ga4/overview/route';

type Props = {
  data: Summary;
};

export function KpiCards({ data }: Props) {
  // choose label based on Delta source: when we compute prev-period we still store in deltasYoY
  // so detect via window.location if compare=prev to show correct label
  let comparisonLabel = 'vs föregående år';
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('compare') === 'prev') comparisonLabel = 'vs föregående period';
    if (sp.get('compare') === 'none') comparisonLabel = '';
  }
  const kpis = [
    {
      title: 'Sessions',
      value: data.sessions,
      delta: data.deltasYoY?.sessions,
      icon: Users,
      description: 'Antal besökssessioner',
    },
    {
      title: 'Total users',
      value: data.totalUsers ?? 0,
      delta: data.deltasYoY?.totalUsers,
      icon: Users,
      description: 'Totalt antal användare',
    },
    {
      title: 'Returning users',
      value: data.returningUsers ?? 0,
      delta: data.deltasYoY?.returningUsers,
      icon: UserCheck,
      description: 'Återkommande användare (totalUsers − newUsers)',
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
    {
      title: 'Sidvisningar',
      value: data.pageviews ?? 0,
      delta: data.deltasYoY?.pageviews,
      icon: Eye,
      description: 'Antal sidvisningar',
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
            comparisonLabel={comparisonLabel || undefined}
          />
        );
      })}
    </div>
  );
}

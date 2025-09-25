'use client';

import { ScoreCard } from '@/components/ui/scorecard';
import { Switch } from '@/components/FormElements/switch';
import { Users, MousePointer, TrendingUp, Clock, UserCheck, Eye } from 'lucide-react';
import { formatNumber, formatPercent, formatTime } from '@/utils/format';
import type { Summary } from '@/app/api/ga4/overview/route';

type Props = {
  data: Summary;
  activeSeries?: {
    sessions: boolean;
    totalUsers: boolean;
    returningUsers: boolean;
    engagedSessions: boolean;
    engagementRatePct: boolean;
    avgEngagementTimeSec: boolean;
    pageviews: boolean;
  };
  onToggleSeries?: (key: keyof NonNullable<Props['activeSeries']>, value: boolean) => void;
};

export function KpiCards({ data, activeSeries, onToggleSeries }: Props) {
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
      seriesKey: 'sessions' as const,
    },
    {
      title: 'Total users',
      value: data.totalUsers ?? 0,
      delta: data.deltasYoY?.totalUsers,
      icon: Users,
      description: 'Totalt antal användare',
      seriesKey: 'totalUsers' as const,
    },
    {
      title: 'Returning users',
      value: data.returningUsers ?? 0,
      delta: data.deltasYoY?.returningUsers,
      icon: UserCheck,
      description: 'Återkommande användare (totalUsers − newUsers)',
      seriesKey: 'returningUsers' as const,
    },
    {
      title: 'Engagerade sessioner',
      value: data.engagedSessions,
      delta: data.deltasYoY?.engagedSessions,
      icon: MousePointer,
      description: 'Sessioner med engagemang (≥10s eller ≥2 sidvisningar)',
      seriesKey: 'engagedSessions' as const,
    },
    {
      title: 'Engagemangsgrad',
      value: data.engagementRatePct,
      delta: data.deltasYoY?.engagementRatePct,
      icon: TrendingUp,
      description: 'Procent engagerade sessioner',
      isPercentage: true,
      seriesKey: 'engagementRatePct' as const,
    },
    {
      title: 'Avg. Engagement time',
      value: data.avgEngagementTimeSec,
      delta: data.deltasYoY?.avgEngagementTimePct,
      icon: Clock,
      description: 'Genomsnittlig tid per session',
      isTime: true,
      seriesKey: 'avgEngagementTimeSec' as const,
    },
    {
      title: 'Sidvisningar',
      value: data.pageviews ?? 0,
      delta: data.deltasYoY?.pageviews,
      icon: Eye,
      description: 'Antal sidvisningar',
      seriesKey: 'pageviews' as const,
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
          <div key={kpi.title} className="relative">
            {/* Toggle bottom-right, smaller */}
            {kpi.seriesKey && (
              <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
                <Switch
                  checked={activeSeries ? activeSeries[kpi.seriesKey] : undefined}
                  onChange={(val) => onToggleSeries?.(kpi.seriesKey!, val)}
                  ariaLabel={`Visa ${kpi.title} i diagrammet`}
                  backgroundSize="sm"
                />
              </div>
            )}
            <ScoreCard
            key={kpi.title}
            label={kpi.title}
            value={displayValue}
            growthRate={kpi.delta ?? undefined}
            Icon={Icon}
            source="GA4 Data API"
            comparisonLabel={comparisonLabel || undefined}
            className="relative pr-5 pb-6"
            />
          </div>
        );
      })}
    </div>
  );
}

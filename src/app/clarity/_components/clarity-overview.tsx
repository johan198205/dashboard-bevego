"use client";

import { useEffect, useState } from "react";
import { ScoreCard } from "@/components/ui/scorecard";
import { compactFormat, standardFormat } from "@/lib/format-number";
import { clarityService } from "@/services/clarity.service";
import { ClarityOverview as ClarityOverviewType } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import * as icons from "./icons";

export function ClarityOverview() {
  const { state } = useFilters();
  const [data, setData] = useState<ClarityOverviewType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await clarityService.getOverview({
          range: {
            start: state.range.start,
            end: state.range.end,
            grain: state.range.grain
          },
          filters: {
            device: state.device,
            country: [], // TODO: Add country filter to global filters
            source: state.channel,
            browser: [], // TODO: Add browser filter to global filters
            os: [] // TODO: Add OS filter to global filters
          }
        });
        setData(result);
      } catch (error) {
        console.error("Failed to fetch Clarity overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [state.range, state.device, state.channel]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <p className="text-dark-6 dark:text-dark-4">Kunde inte ladda Clarity-data</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      <ScoreCard
        label="Sessions (totalt)"
        value={compactFormat(data.sessions)}
        Icon={icons.Sessions}
        variant="primary"
        source={data.source}
      />

      <ScoreCard
        label="Genomsnittlig engagemangstid"
        value={`${Math.round(data.avgEngagementTime)}s`}
        Icon={icons.Engagement}
        variant="info"
        source={data.source}
      />

      <ScoreCard
        label="Genomsnittlig scroll-depth"
        value={`${Math.round(data.avgScrollDepth)}%`}
        Icon={icons.ScrollDepth}
        variant="success"
        source={data.source}
      />

      <ScoreCard
        label="Rage clicks"
        value={`${compactFormat(data.rageClicks.count)} (${Math.round(data.rageClicks.percentage)}%)`}
        Icon={icons.RageClicks}
        variant="error"
        source={data.source}
      />

      <ScoreCard
        label="Dead clicks"
        value={`${compactFormat(data.deadClicks.count)} (${Math.round(data.deadClicks.percentage)}%)`}
        Icon={icons.DeadClicks}
        variant="warning"
        source={data.source}
      />

      <ScoreCard
        label="Quick-back"
        value={`${Math.round(data.quickBack.percentage)}%`}
        Icon={icons.QuickBack}
        variant="warning"
        source={data.source}
      />

      <ScoreCard
        label="Script errors"
        value={compactFormat(data.scriptErrors.count)}
        Icon={icons.ScriptErrors}
        variant="error"
        source={data.source}
      />
    </div>
  );
}

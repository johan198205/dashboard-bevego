"use client";

import { useEffect, useState } from "react";
import { ScoreCard } from "@/components/ui/scorecard";
import { compactFormat } from "@/lib/format-number";
import { clarityService } from "@/services/clarity.service";
import { ClarityOverview as ClarityOverviewType, ClarityScore } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import * as icons from "./icons";

export function ClarityOverview() {
  const { state } = useFilters();
  const [data, setData] = useState<ClarityOverviewType | null>(null);
  const [clarityScore, setClarityScore] = useState<ClarityScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
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
        };

        const [overviewResult, scoreResult] = await Promise.all([
          clarityService.getOverview(params),
          clarityService.getClarityScore(params)
        ]);
        
        setData(overviewResult);
        setClarityScore(scoreResult);
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
        {Array.from({ length: 8 }).map((_, i) => (
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

  // Helper function to get status chip styling
  const getStatusChipStyle = (grade: string) => {
    switch (grade) {
      case 'Bra':
        return {
          className: "bg-green-light-6 text-green border border-green/20",
          text: "Bra"
        };
      case 'Behöver förbättras':
        return {
          className: "bg-yellow-light-4 text-yellow-dark border border-yellow/20",
          text: "Behöver förbättras"
        };
      case 'Dålig':
        return {
          className: "bg-red-light-6 text-red border border-red/20",
          text: "Dålig"
        };
      case 'N/A':
        return {
          className: "bg-neutral-200 text-neutral-600 border border-neutral-300",
          text: "N/A"
        };
      default:
        return {
          className: "bg-neutral-200 text-neutral-600 border border-neutral-300",
          text: "N/A"
        };
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      {/* Clarity Score - First and most prominent card */}
      {clarityScore && (
        <div className="relative overflow-hidden rounded-lg bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3">
          {/* Accent bar */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-primary" />
          
          <div className="p-6">
            {/* Header with icon and status chip */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg shadow-sm bg-primary/10">
                <icons.ClarityScore className="h-6 w-6 text-primary" />
              </div>
              
              {/* Status chip */}
              <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${getStatusChipStyle(clarityScore.grade).className}`}>
                {getStatusChipStyle(clarityScore.grade).text}
              </div>
            </div>

            {/* Main content */}
            <div className="space-y-2">
              <div className="text-3xl font-bold text-dark dark:text-white tracking-tight">
                {clarityScore.score} / 100
              </div>
              <div className="text-sm font-medium text-dark-6 dark:text-dark-4">
                Clarity Score
              </div>
            </div>

            {/* Source attribution */}
            <div className="mt-6 flex items-center gap-1 text-xs text-dark-5 dark:text-dark-6">
              <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                <span className="text-[10px] font-bold">i</span>
              </div>
              Källa: {clarityScore.source}
            </div>
          </div>
        </div>
      )}

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

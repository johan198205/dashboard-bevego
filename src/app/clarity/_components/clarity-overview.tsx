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
      } catch (error: any) {
        console.error("Failed to fetch Clarity overview data:", error);
        setData(null); // Set to null to trigger empty state
        setClarityScore(null);
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
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-dark-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
            Ingen Clarity-data tillgänglig
          </h3>
          <p className="text-dark-6 dark:text-dark-4 mb-4">
            Databasen är tom. Kör datahämtning för att synka Clarity-data.
          </p>
          <button
            onClick={async () => {
              try {
                setLoading(true);
                const response = await fetch('/api/clarity/sync', { method: 'POST' });
                if (response.ok) {
                  window.location.reload();
                } else {
                  alert('Datahämtning misslyckades. Se konsolen för detaljer.');
                }
              } catch (error) {
                alert('Datahämtning misslyckades: ' + error);
              } finally {
                setLoading(false);
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            disabled={loading}
          >
            {loading ? 'Hämtar...' : 'Hämta Clarity-data nu'}
          </button>
        </div>
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
        value={(() => {
          // GA4 averageSessionDuration returns seconds, format as minutes and seconds
          const totalSeconds = Math.round(data.avgEngagementTime);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          return `${minutes}m ${seconds}s`;
        })()}
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

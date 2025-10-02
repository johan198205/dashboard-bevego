"use client";

import { useEffect, useState } from "react";
import { ScoreCard } from "@/components/ui/scorecard";
import { compactFormat, standardFormat } from "@/lib/format-number";
import { clarityService } from "@/services/clarity.service";
import { ClarityOverview as ClarityOverviewType, ClarityScore } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import * as icons from "./icons";

export function ClarityOverviewNew() {
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
            country: [],
            source: state.channel,
            browser: [],
            os: []
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
        setData(null);
        setClarityScore(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [state.range, state.device, state.channel]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Core Metrics Loading */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
        
        {/* User Behavior Loading */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
        
        {/* Technical Metrics Loading */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
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

  // Helper function to format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Helper function to format time with decimals
  const formatTimeDecimal = (seconds: number) => {
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)} min`;
  };

  // Custom component for percentage + sessions display
  const PercentageWithSessions = ({ percentage, sessions, label, Icon }: { percentage: number; sessions: number; label: string; Icon: any }) => (
    <div className="rounded-[5px] bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3 px-6 py-5 transition-transform transition-shadow duration-200 ease-out will-change-transform motion-reduce:transition-none motion-reduce:transform-none hover:shadow-md hover:border-primary/30 motion-reduce:hover:shadow-sm hover:scale-[1.01] focus-visible:scale-[1.01] motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-neutral-600 dark:text-dark-5 mb-1">
            {label}
          </div>
          <div className="text-4xl font-semibold text-neutral-900 dark:text-white leading-none mb-1">
            {percentage.toFixed(2)}%
          </div>
          <div className="text-sm text-neutral-500 dark:text-dark-4">
            {sessions.toLocaleString()} sessions
          </div>
        </div>
        {/* Icon badge */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg shadow-sm bg-red-100 dark:bg-red-900/30">
          <Icon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Core Metrics Section */}
      <div>
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Grundläggande mätvärden</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard
            label="Sessions"
            value={data.sessions.toLocaleString()}
            Icon={icons.Users}
            source={data.source}
          />
          
          <ScoreCard
            label="Unique users"
            value={data.uniqueUsers.toLocaleString()}
            Icon={icons.User}
            source={data.source}
          />
          
          <ScoreCard
            label="Pages per session"
            value={data.pagesPerSession.toFixed(2)}
            Icon={icons.FileText}
            source={data.source}
          />
          
          <ScoreCard
            label="Scroll depth"
            value={`${data.avgScrollDepth.toFixed(2)}%`}
            Icon={icons.TrendingUp}
            source={data.source}
          />
        </div>
      </div>

      {/* User Behavior Section */}
      <div>
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Användarbeteende</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PercentageWithSessions
            percentage={data.rageClicks.percentage}
            sessions={data.rageClicks.sessions}
            label="Rage clicks"
            Icon={icons.Target}
          />
          
          <PercentageWithSessions
            percentage={data.deadClicks.percentage}
            sessions={data.deadClicks.sessions}
            label="Dead clicks"
            Icon={icons.X}
          />
          
          <PercentageWithSessions
            percentage={data.excessiveScrolling.percentage}
            sessions={data.excessiveScrolling.sessions}
            label="Excessive scrolling"
            Icon={icons.Move}
          />
          
          <PercentageWithSessions
            percentage={data.quickBack.percentage}
            sessions={data.quickBack.sessions}
            label="Quick backs"
            Icon={icons.ArrowLeft}
          />
        </div>
      </div>

      {/* User Segments Section */}
      <div>
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Användarsegment</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <PercentageWithSessions
            percentage={data.newUsers.percentage}
            sessions={data.newUsers.sessions}
            label="Sessions with new users"
            Icon={icons.UserPlus}
          />
          
          <PercentageWithSessions
            percentage={data.returningUsers.percentage}
            sessions={data.returningUsers.sessions}
            label="Sessions with returning users"
            Icon={icons.UserCheck}
          />
        </div>
      </div>

      {/* Technical Metrics Section */}
      <div>
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Tekniska mätvärden</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ScoreCard
            label="Active time spent"
            value={formatTimeDecimal(data.avgEngagementTime)}
            Icon={icons.Clock}
            source={data.source}
          />
          
          <PercentageWithSessions
            percentage={data.scriptErrors.percentage}
            sessions={data.scriptErrors.sessions}
            label="JavaScript errors"
            Icon={icons.AlertTriangle}
          />
          
          <PercentageWithSessions
            percentage={data.botTraffic.percentage}
            sessions={data.botTraffic.sessions}
            label="Bot traffic"
            Icon={icons.Bot}
          />
        </div>
      </div>

      {/* Clarity Score Section */}
      {clarityScore && (
        <div>
          <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Clarity Score</h3>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
            <ScoreCard
              label="Clarity Score"
              value={`${clarityScore.score} / 100`}
              Icon={icons.Star}
              source={data.source}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ClarityTrendsChart } from "./clarity-trends-chart";
import { ClarityTrendPoint, ClarityOverview } from "@/lib/types";
import { clarityService } from "@/services/clarity.service";
import { useFilters } from "@/components/GlobalFilters";
import { cn } from "@/lib/utils";

export function ClarityTrends() {
  const { state } = useFilters();
  const [data, setData] = useState<ClarityTrendPoint[]>([]);
  const [source, setSource] = useState<string>('Mock');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [trendsResult, overviewResult] = await Promise.all([
          clarityService.getTrends({
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
          }),
          clarityService.getOverview({
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
          })
        ]);
        setData(trendsResult);
        setSource(overviewResult.source);
      } catch (error) {
        console.error("Failed to fetch Clarity trends data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [state.range, state.device, state.channel]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sessions & Engagement Time Chart */}
      <div
        className={cn(
          "rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card"
        )}
      >
        <div className="mb-6">
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            Sessions & Engagemangstid
          </h2>
          <p className="text-sm text-dark-6 dark:text-dark-4 mt-1">
            Källa: {source}
          </p>
        </div>
        <ClarityTrendsChart
          data={data}
          series={[
            {
              name: "Sessions",
              data: data.map(d => ({ x: d.date, y: d.sessions })),
              color: "#E01E26"
            },
            {
              name: "Engagemangstid (s)",
              data: data.map(d => ({ x: d.date, y: d.engagementTime })),
              color: "#3C50E0"
            }
          ]}
        />
      </div>

      {/* Scroll Depth Chart */}
      <div
        className={cn(
          "rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card"
        )}
      >
        <div className="mb-6">
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            Scroll Depth
          </h2>
          <p className="text-sm text-dark-6 dark:text-dark-4 mt-1">
            Källa: {source}
          </p>
        </div>
        <ClarityTrendsChart
          data={data}
          series={[
            {
              name: "Scroll Depth (%)",
              data: data.map(d => ({ x: d.date, y: d.scrollDepth })),
              color: "#10B981"
            }
          ]}
        />
      </div>

      {/* Rage/Dead/Quick-back Chart */}
      <div
        className={cn(
          "rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card"
        )}
      >
        <div className="mb-6">
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            Rage/Dead/Quick-back
          </h2>
          <p className="text-sm text-dark-6 dark:text-dark-4 mt-1">
            Källa: {source}
          </p>
        </div>
        <ClarityTrendsChart
          data={data}
          series={[
            {
              name: "Rage Clicks",
              data: data.map(d => ({ x: d.date, y: d.rageClicks })),
              color: "#EF4444"
            },
            {
              name: "Dead Clicks",
              data: data.map(d => ({ x: d.date, y: d.deadClicks })),
              color: "#F59E0B"
            },
            {
              name: "Quick-back (%)",
              data: data.map(d => ({ x: d.date, y: d.quickBack })),
              color: "#8B5CF6"
            }
          ]}
        />
      </div>

      {/* Script Errors Chart */}
      <div
        className={cn(
          "rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card"
        )}
      >
        <div className="mb-6">
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            Script Errors
          </h2>
          <p className="text-sm text-dark-6 dark:text-dark-4 mt-1">
            Källa: {source}
          </p>
        </div>
        <ClarityTrendsChart
          data={data}
          series={[
            {
              name: "Script Errors",
              data: data.map(d => ({ x: d.date, y: d.scriptErrors })),
              color: "#DC2626"
            }
          ]}
        />
      </div>
    </div>
  );
}

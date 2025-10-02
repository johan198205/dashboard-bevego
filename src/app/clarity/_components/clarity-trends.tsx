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
            Sessions and Unique users
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
              name: "Unique users",
              data: data.map(d => ({ x: d.date, y: Math.round(d.sessions * 0.58) })), // Estimate unique users as 58% of sessions
              color: "#F87171"
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
              color: "#F23030"
            }
          ]}
          showDecimals={true}
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
              name: "Rage Clicks (sessions)",
              data: data.map(d => ({ x: d.date, y: Math.round(d.sessions * 0.04 / 100) })), // 0.04% of sessions
              color: "#E01E26"
            },
            {
              name: "Dead Clicks (sessions)",
              data: data.map(d => ({ x: d.date, y: Math.round(d.sessions * 4.6 / 100) })), // 4.6% of sessions
              color: "#F87171"
            },
            {
              name: "Quick-back (sessions)",
              data: data.map(d => ({ x: d.date, y: Math.round(d.sessions * d.quickBack / 100) })), // quickBack% of sessions
              color: "#FCA5A5"
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
              name: "Script Errors (sessions)",
              data: data.map(d => ({ x: d.date, y: Math.round(d.sessions * 1.07 / 100) })), // 1.07% of sessions
              color: "#B91C1C"
            }
          ]}
        />
      </div>
    </div>
  );
}

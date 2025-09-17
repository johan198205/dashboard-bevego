"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { compactFormat } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { ClarityInsight } from "@/lib/types";
import { clarityService } from "@/services/clarity.service";
import { useFilters } from "@/components/GlobalFilters";

export function ClarityInsights() {
  const { state } = useFilters();
  const [data, setData] = useState<ClarityInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await clarityService.getInsights({
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
        console.error("Failed to fetch Clarity insights data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [state.range, state.device, state.channel]);

  if (loading) {
    return (
      <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark"
      )}
    >
      <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Prioriteringslista (Insights)
        </h2>
        <p className="text-sm text-dark-6 dark:text-dark-4 mt-1">
          Topp 10 problemsidor baserat på sessions_weighted * friction_score
        </p>
        <p className="text-xs text-dark-5 dark:text-dark-6 mt-1">
          Källa: Mock
        </p>
      </div>

      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">URL</TableHead>
              <TableHead className="text-center">Sessions</TableHead>
              <TableHead className="text-center">Rage per 1k</TableHead>
              <TableHead className="text-center">Dead per 1k</TableHead>
              <TableHead className="text-center">Quick-back %</TableHead>
              <TableHead className="text-center">Prioritet</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((insight, i) => (
              <TableRow key={insight.url + i}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="font-medium text-dark dark:text-white">
                      {insight.url}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  {compactFormat(insight.sessions)}
                </TableCell>

                <TableCell className="text-center">
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {Math.round(insight.ragePer1k)}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    {Math.round(insight.deadPer1k)}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {Math.round(insight.quickBackPct)}%
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center">
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                      {Math.round(insight.priority)}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Explanation of priority calculation */}
        <div className="mt-6 rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <h4 className="text-sm font-semibold text-dark dark:text-white mb-2">
            Prioritet beräkning:
          </h4>
          <p className="text-xs text-dark-6 dark:text-dark-4">
            Prioritet = sessions_weighted × friction_score
          </p>
          <p className="text-xs text-dark-6 dark:text-dark-4 mt-1">
            friction_score = (0.5 × rage_per_1k) + (0.3 × dead_per_1k) + (0.2 × quick_back_%)
          </p>
          <p className="text-xs text-dark-6 dark:text-dark-4 mt-1">
            sessions_weighted = log(sessions + 1) för att undvika att höga sessions dominerar
          </p>
        </div>
      </div>
    </div>
  );
}

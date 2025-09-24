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
import { compactFormat, standardFormat } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { ClarityUrlRow } from "@/lib/types";
import { clarityService } from "@/services/clarity.service";
import { useFilters } from "@/components/GlobalFilters";

export function ClarityTable() {
  const { state } = useFilters();
  const [data, setData] = useState<ClarityUrlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof ClarityUrlRow>("sessions");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await clarityService.getUrls({
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
        console.error("Failed to fetch Clarity URLs data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [state.range, state.device, state.channel]);

  const handleSort = (column: keyof ClarityUrlRow) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];

    // Handle nested objects
    if (sortBy === "rageClicks") {
      aValue = a.rageClicks.per1k;
      bValue = b.rageClicks.per1k;
    } else if (sortBy === "deadClicks") {
      aValue = a.deadClicks.per1k;
      bValue = b.deadClicks.per1k;
    }

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
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
          Per sida/URL
        </h2>
        <p className="text-sm text-dark-6 dark:text-dark-4 mt-1">
          Källa: Mock
        </p>
      </div>

      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="min-w-[200px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort("url")}
              >
                URL
                {sortBy === "url" && (
                  <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort("sessions")}
              >
                Sessions
                {sortBy === "sessions" && (
                  <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead className="text-center">
                Engagemangstid (s)
              </TableHead>
              <TableHead className="text-center">
                Scroll Depth (%)
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort("rageClicks")}
              >
                Rage clicks (antal / per 1k)
                {sortBy === "rageClicks" && (
                  <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort("deadClicks")}
              >
                Dead clicks (antal / per 1k)
                {sortBy === "deadClicks" && (
                  <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </TableHead>
              <TableHead className="text-center">
                Quick-back %
              </TableHead>
              <TableHead className="text-center">
                Script errors
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedData.map((row, i) => (
              <TableRow key={row.url + i}>
                <TableCell>
                  <div className="font-medium text-dark dark:text-white">
                    {row.url}
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  {compactFormat(row.sessions)}
                </TableCell>

                <TableCell className="text-center">
                  {(() => {
                    // GA4 averageSessionDuration returns seconds, format as minutes and seconds
                    const totalSeconds = Math.round(row.engagementTime);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    return `${minutes}m ${seconds}s`;
                  })()}
                </TableCell>

                <TableCell className="text-center">
                  {Math.round(row.scrollDepth)}%
                </TableCell>

                <TableCell className="text-center">
                  <div className="space-y-1">
                    <div className="font-medium text-red-600 dark:text-red-400">
                      {compactFormat(row.rageClicks.count)}
                    </div>
                    <div className="text-xs text-dark-6 dark:text-dark-4">
                      {Math.round(row.rageClicks.per1k)} per 1k
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <div className="space-y-1">
                    <div className="font-medium text-yellow-600 dark:text-yellow-400">
                      {compactFormat(row.deadClicks.count)}
                    </div>
                    <div className="text-xs text-dark-6 dark:text-dark-4">
                      {Math.round(row.deadClicks.per1k)} per 1k
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <span className="text-orange-600 dark:text-orange-400">
                    {Math.round(row.quickBack)}%
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <span className="text-red-600 dark:text-red-400">
                    {compactFormat(row.scriptErrors)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

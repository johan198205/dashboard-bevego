'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber, formatWeekday, formatHour } from '@/utils/format';
import type { WeekdayHour } from '@/app/api/ga4/overview/route';

type Props = {
  data: WeekdayHour[];
};

export function UsageHeatmap({ data }: Props) {
  // Create a 7x24 grid (weekdays x hours)
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ sessions: 0, engagedSessions: 0 })));
  
  // Fill the grid with data
  data.forEach(item => {
    if (item.weekday >= 0 && item.weekday < 7 && item.hour >= 0 && item.hour < 24) {
      grid[item.weekday][item.hour] = {
        sessions: item.sessions,
        engagedSessions: item.engagedSessions
      };
    }
  });

  // Calculate min, median, and max for color scaling
  const allSessions = data.map(d => d.sessions).filter(s => s > 0);
  const minSessions = Math.min(...allSessions);
  const maxSessions = Math.max(...allSessions);
  const medianSessions = allSessions.sort((a, b) => a - b)[Math.floor(allSessions.length / 2)];

  // Get color intensity based on sessions
  const getColorIntensity = (sessions: number) => {
    if (sessions === 0) return 'bg-gray-100 dark:bg-gray-800';
    
    const intensity = (sessions - minSessions) / (maxSessions - minSessions);
    
    if (intensity < 0.2) return 'bg-blue-100 dark:bg-blue-900';
    if (intensity < 0.4) return 'bg-blue-200 dark:bg-blue-800';
    if (intensity < 0.6) return 'bg-blue-300 dark:bg-blue-700';
    if (intensity < 0.8) return 'bg-blue-400 dark:bg-blue-600';
    return 'bg-blue-500 dark:bg-blue-500';
  };

  const weekdays = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

  return (
    <AnalyticsBlock
      title="Användningsmönster"
      description="Sessions per veckodag och timme"
    >
        <div className="space-y-4">
          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Hour headers */}
              <div className="flex">
                <div className="w-12 h-8"></div> {/* Empty cell for weekday labels */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div 
                    key={hour} 
                    className="w-8 h-8 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 font-medium"
                  >
                    {hour}
                  </div>
                ))}
              </div>

              {/* Weekday rows */}
              {grid.map((weekdayData, weekday) => (
                <div key={weekday} className="flex">
                  {/* Weekday label */}
                  <div className="w-12 h-8 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {weekdays[weekday]}
                  </div>
                  
                  {/* Hour cells */}
                  {weekdayData.map((cellData, hour) => (
                    <TooltipProvider key={hour}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={`w-8 h-8 border border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600 ${getColorIntensity(cellData.sessions)}`}
                            aria-label={`${formatWeekday(weekday)} ${formatHour(hour)} - ${formatNumber(cellData.sessions)} sessions`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {formatWeekday(weekday)} {formatHour(hour)}
                            </p>
                            <p className="text-sm">
                              Sessions: {formatNumber(cellData.sessions)}
                            </p>
                            <p className="text-sm">
                              Engagerade: {formatNumber(cellData.engagedSessions)}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>Lägsta:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"></div>
                <span>{formatNumber(minSessions)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span>Median:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-300 dark:bg-blue-700 border border-gray-200 dark:border-gray-700"></div>
                <span>{formatNumber(medianSessions)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span>Högsta:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 dark:bg-blue-500 border border-gray-200 dark:border-gray-700"></div>
                <span>{formatNumber(maxSessions)}</span>
              </div>
            </div>
          </div>

          {/* Usage insights */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Användningsinsikter:
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Mörkare färger indikerar högre trafik</li>
              <li>• Hovra över celler för detaljerad information</li>
              <li>• Veckodagar: 0 = söndag, 1 = måndag, osv.</li>
              <li>• Timmar: 0 = 00:00, 23 = 23:00</li>
            </ul>
          </div>
        </div>
    </AnalyticsBlock>
  );
}

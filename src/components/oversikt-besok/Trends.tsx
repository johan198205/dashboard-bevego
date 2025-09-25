'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber, formatPercent, formatDateTooltip } from '@/utils/format';
import type { TimePoint } from '@/app/api/ga4/overview/route';

type Props = {
  data: TimePoint[];
};

export function Trends({ data }: Props) {
  // Transform data for the chart
  const chartData = data.map(point => ({
    ...point,
    // Format date for display
    dateFormatted: new Date(point.date).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric'
    })
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDateTooltip(data.date)}
          </p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Sessions:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatNumber(data.sessions)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Engagerade:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatNumber(data.engagedSessions)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Engagemangsgrad:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatPercent(data.engagementRatePct)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Find max values for Y-axis scaling
  const maxSessions = Math.max(...data.map(d => d.sessions));
  const maxEngaged = Math.max(...data.map(d => d.engagedSessions));
  const maxValue = Math.max(maxSessions, maxEngaged);

  return (
    <AnalyticsBlock
      title="Tidsutveckling"
      description="Sessions och engagerade sessioner över tid"
    >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="dateFormatted" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="sessions"
                orientation="left"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, maxValue]}
                tickFormatter={(value) => formatNumber(value)}
              />
              <YAxis 
                yAxisId="engagement"
                orientation="right"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Sessions line */}
              <Line
                yAxisId="sessions"
                type="monotone"
                dataKey="sessions"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                name="Sessions"
              />
              
              {/* Engaged sessions line */}
              <Line
                yAxisId="sessions"
                type="monotone"
                dataKey="engagedSessions"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                name="Engagerade sessioner"
              />
              
              {/* Engagement rate line (secondary axis) */}
              <Line
                yAxisId="engagement"
                type="monotone"
                dataKey="engagementRatePct"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#8b5cf6', strokeWidth: 2 }}
                name="Engagemangsgrad (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with additional info */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Sessions (vänster axel)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Engagerade sessioner (vänster axel)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #8b5cf6, #8b5cf6 3px, transparent 3px, transparent 6px)' }}></div>
            <span>Engagemangsgrad (höger axel)</span>
          </div>
        </div>
    </AnalyticsBlock>
  );
}

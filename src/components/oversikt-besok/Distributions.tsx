'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatNumber, formatPercent } from '@/utils/format';
import type { Split } from '@/app/api/ga4/overview/route';

type Props = {
  title: string;
  data: Split[];
  type: 'channel' | 'device';
};

// Color palette for charts
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#ec4899', // pink
  '#6b7280', // gray
];

// Channel name mapping
const CHANNEL_NAMES: Record<string, string> = {
  'Organic Search': 'Organisk sökning',
  'Direct': 'Direkt',
  'Referral': 'Referral',
  'Social': 'Social',
  'Email': 'E-post',
  'Paid Search': 'Betald sökning',
  'Display': 'Display',
  'Other': 'Övrigt',
};

// Device name mapping
const DEVICE_NAMES: Record<string, string> = {
  'desktop': 'Desktop',
  'mobile': 'Mobil',
  'tablet': 'Surfplatta',
};

export function Distributions({ title, data, type }: Props) {
  // Transform data for the chart
  const chartData = data.map((item, index) => ({
    ...item,
    name: type === 'channel' 
      ? CHANNEL_NAMES[item.key] || item.key
      : DEVICE_NAMES[item.key] || item.key,
    color: COLORS[index % COLORS.length],
  }));

  // Calculate total sessions
  const totalSessions = data.reduce((sum, item) => sum + item.sessions, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <div className="space-y-1 mt-2">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sessions:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatNumber(data.sessions)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Andel:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatPercent((data.sessions / totalSessions) * 100)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
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

  // Custom label function for pie slices
  const renderLabel = (entry: any) => {
    const percent = ((entry.sessions / totalSessions) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <AnalyticsBlock
      title={title}
      description={`Fördelning av sessions per ${type === 'channel' ? 'kanal' : 'enhet'}`}
    >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="sessions"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-2">
          {chartData.map((item, index) => (
            <div key={item.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
              </div>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                <span>{formatNumber(item.sessions)}</span>
                <span className="w-16 text-right">
                  {formatPercent((item.sessions / totalSessions) * 100)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900 dark:text-white">Totalt:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatNumber(totalSessions)} sessions
            </span>
          </div>
        </div>
    </AnalyticsBlock>
  );
}

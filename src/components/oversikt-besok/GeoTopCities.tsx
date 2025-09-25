'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber, formatPercent } from '@/utils/format';
import type { Split } from '@/app/api/ga4/overview/route';

type Props = {
  data: Split[];
};

export function GeoTopCities({ data }: Props) {
  // Take top 5 cities and sort by sessions
  const topCities = [...data]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  // Transform data for the chart
  const chartData = topCities.map((city, index) => ({
    ...city,
    name: city.key === '(not set)' ? 'Okänd plats' : city.key,
    index: index + 1,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            {data.name}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sessions:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatNumber(data.sessions)}
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

  // Calculate total sessions for percentage display
  const totalSessions = data.reduce((sum, city) => sum + city.sessions, 0);

  return (
    <AnalyticsBlock
      title="Topp-städer"
      description="Mest besökta städer baserat på sessions"
    >
        <div className="space-y-4">
          {/* Bar Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="sessions" 
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* City List with Engagement Rates */}
          <div className="space-y-2">
            {chartData.map((city, index) => (
              <div key={city.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {city.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatPercent((city.sessions / totalSessions) * 100)} av totalt
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatNumber(city.sessions)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatPercent(city.engagementRatePct)} eng.
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatNumber(totalSessions)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Totalt sessions</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatPercent(
                    chartData.reduce((sum, city) => sum + city.engagementRatePct, 0) / chartData.length
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Genomsnittlig eng. rate</div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Geografisk fördelning:
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-200">
              Baserat på användarnas uppskattade plats från GA4. 
              "Okänd plats" kan bero på VPN-användning eller begränsad platsdata.
            </p>
          </div>
        </div>
    </AnalyticsBlock>
  );
}

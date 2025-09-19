"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NDISeriesPoint } from '@/types/ndi';
import { cn } from '@/lib/utils';

interface NDIChartProps {
  data: NDISeriesPoint[];
  className?: string;
}

export function NDIChart({ data, className }: NDIChartProps) {
  const formatTooltipValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toFixed(1);
  };

  const formatPeriod = (period: string) => {
    return period.replace('Q', ' Q');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-dark dark:text-white">
            {formatPeriod(label)}
          </p>
          <p className="text-sm text-dark-6 dark:text-dark-4">
            NDI: <span className="font-medium">{formatTooltipValue(data.value)}</span>
          </p>
          {data.r4 && (
            <p className="text-sm text-dark-6 dark:text-dark-4">
              Rullande 4Q: <span className="font-medium">{formatTooltipValue(data.r4)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full h-80", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="period" 
            tickFormatter={formatPeriod}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#dc2626" 
            strokeWidth={3}
            dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2 }}
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="r4" 
            stroke="#059669" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#059669', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#059669', strokeWidth: 2 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-600"></div>
          <span className="text-dark-6 dark:text-dark-4">NDI per kvartal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-600 border-dashed border-t-2 border-green-600"></div>
          <span className="text-dark-6 dark:text-dark-4">Rullande 4Q</span>
        </div>
      </div>
    </div>
  );
}

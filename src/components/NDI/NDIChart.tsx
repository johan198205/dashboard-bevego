"use client";

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NDISeriesPoint } from '@/types/ndi';
import { cn } from '@/lib/utils';

interface NDIChartProps {
  data: NDISeriesPoint[];
  className?: string;
}

export function NDIChart({ data, className }: NDIChartProps) {
  const [showQuarterly, setShowQuarterly] = useState(true);
  const [showRolling4Q, setShowRolling4Q] = useState(true);
  const [showYoY, setShowYoY] = useState(true);

  const formatTooltipValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
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
          {showQuarterly && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              NDI: <span className="font-medium text-gray-900 dark:text-gray-100">{formatTooltipValue(data.value)}</span>
            </p>
          )}
          {showRolling4Q && data.r4 && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Rullande 4Q: <span className="font-medium text-gray-900 dark:text-gray-100">{formatTooltipValue(data.r4)}</span>
            </p>
          )}
          {showYoY && data.yoy && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Samma kvartal året innan: <span className="font-medium text-gray-900 dark:text-gray-100">{formatTooltipValue(data.yoy)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="period" 
              tickFormatter={formatPeriod}
              stroke="#374151"
              fontSize={12}
              tick={{ fill: '#374151' }}
            />
            <YAxis 
              stroke="#374151"
              fontSize={12}
              domain={[55, 65]}
              tick={{ fill: '#374151' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showQuarterly && (
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#E01E26" 
                strokeWidth={3}
                dot={{ fill: '#E01E26', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#E01E26', strokeWidth: 2 }}
                connectNulls={false}
              />
            )}
            {showRolling4Q && (
              <Line 
                type="monotone" 
                dataKey="r4" 
                stroke="#F87171" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#F87171', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#F87171', strokeWidth: 2 }}
                connectNulls={false}
              />
            )}
            {showYoY && (
              <Line 
                type="monotone" 
                dataKey="yoy" 
                stroke="#FCA5A5" 
                strokeWidth={2}
                strokeDasharray="8 8"
                dot={{ fill: '#FCA5A5', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#FCA5A5', strokeWidth: 2 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Checkboxes for toggling lines */}
      <div className="flex items-center justify-center gap-8 mt-6 text-base">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={showQuarterly}
            onChange={(e) => setShowQuarterly(e.target.checked)}
            className="w-5 h-5 text-red-600 bg-white border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 accent-red-600"
          />
          <div className="w-6 h-1 rounded-sm" style={{ backgroundColor: '#E01E26' }}></div>
          <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-red-600 transition-colors duration-200">NDI per kvartal</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={showRolling4Q}
            onChange={(e) => setShowRolling4Q(e.target.checked)}
            className="w-5 h-5 text-red-600 bg-white border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 accent-red-600"
          />
          <div className="w-6 h-1 rounded-sm border-dashed border-t-2" style={{ backgroundColor: '#F87171', borderColor: '#F87171' }}></div>
          <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-red-600 transition-colors duration-200">Rullande 4Q</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={showYoY}
            onChange={(e) => setShowYoY(e.target.checked)}
            className="w-5 h-5 text-red-600 bg-white border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 accent-red-600"
          />
          <div className="w-6 h-1 rounded-sm border-dashed border-t-2" style={{ backgroundColor: '#FCA5A5', borderColor: '#FCA5A5' }}></div>
          <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-red-600 transition-colors duration-200">Samma kvartal året innan</span>
        </label>
      </div>
    </div>
  );
}

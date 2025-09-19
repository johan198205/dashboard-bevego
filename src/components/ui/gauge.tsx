"use client";

import React from "react";

interface GaugeProps {
  valuePct: number; // 0-100
  min?: number;
  max?: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Gauge({ 
  valuePct, 
  min = 0, 
  max = 100, 
  label,
  size = 120,
  strokeWidth = 8,
  className = ""
}: GaugeProps) {
  // Clamp value to valid range
  const clampedValue = Math.max(min, Math.min(max, valuePct));
  const normalizedValue = (clampedValue - min) / (max - min);
  
  // SVG arc calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - normalizedValue);
  
  // Colors based on value
  const getColor = (value: number) => {
    if (value >= 80) return "#10B981"; // green-500
    if (value >= 60) return "#F59E0B"; // amber-500
    if (value >= 40) return "#EF4444"; // red-500
    return "#6B7280"; // gray-500
  };
  
  const color = getColor(valuePct);
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg
          width={size}
          height={size / 2 + 20}
          className="overflow-visible"
          viewBox={`0 0 ${size} ${size / 2 + 20}`}
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="dark:stroke-gray-600"
          />
          
          {/* Value arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease-in-out",
            }}
          />
          
          {/* Needle */}
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <line
              x1="0"
              y1="0"
              x2={radius * 0.7 * Math.cos(Math.PI * (1 - normalizedValue))}
              y2={-radius * 0.7 * Math.sin(Math.PI * (1 - normalizedValue))}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                transition: "transform 0.5s ease-in-out, stroke 0.3s ease-in-out",
                transformOrigin: "0 0",
              }}
            />
            <circle
              cx="0"
              cy="0"
              r="4"
              fill={color}
              style={{
                transition: "fill 0.3s ease-in-out",
              }}
            />
          </g>
        </svg>
      </div>
      
      {/* Value text - moved outside SVG container */}
      <div className="text-center mt-2">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {Math.round(valuePct)}%
        </div>
        {label && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Period } from "@/types/ndi";

interface NDIQuarterSelectorProps {
  selectedQuarter: Period | null;
  onQuarterChange: (quarter: Period | null) => void;
}

export function NDIQuarterSelector({ selectedQuarter, onQuarterChange }: NDIQuarterSelectorProps) {
  const [availableQuarters, setAvailableQuarters] = useState<Period[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAvailableQuarters = async () => {
      try {
        const response = await fetch('/api/metrics/ndi/series');
        if (response.ok) {
          const data = await response.json();
          const quarters = data.map((item: any) => item.period).filter(Boolean);
          setAvailableQuarters(quarters);
          
          // Set default to latest quarter if none selected
          if (!selectedQuarter && quarters.length > 0) {
            onQuarterChange(quarters[quarters.length - 1]);
          }
        }
      } catch (error) {
        console.error('Error fetching available quarters:', error);
      }
    };

    fetchAvailableQuarters();
  }, [selectedQuarter, onQuarterChange]);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const formatQuarter = (quarter: Period) => {
    return quarter.replace('Q', ' Q');
  };

  const handleQuarterSelect = (quarter: Period | null) => {
    onQuarterChange(quarter);
    setIsOpen(false);
  };

  const displayValue = selectedQuarter ? formatQuarter(selectedQuarter) : 'Kvartal Alla';

  return (
    <div className="flex items-center gap-3">
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 cursor-pointer min-w-[120px] text-left"
        >
          {displayValue}
        </button>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="py-1">
              <button
                type="button"
                onClick={() => handleQuarterSelect(null)}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                  !selectedQuarter ? 'bg-red-50 text-red-600' : 'text-gray-700'
                }`}
              >
                Kvartal Alla
              </button>
              {availableQuarters.map((quarter) => (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => handleQuarterSelect(quarter)}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                    selectedQuarter === quarter ? 'bg-red-50 text-red-600' : 'text-gray-700'
                  }`}
                >
                  {formatQuarter(quarter)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

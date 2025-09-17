"use client";

import { useState } from "react";
import FilterDropdown from "@/components/FilterDropdown";
import { cn } from "@/lib/utils";

type ClarityFilterState = {
  device: string[];
  country: string[];
  source: string[];
  browser: string[];
  os: string[];
};

export function ClarityFilters() {
  const [filters, setFilters] = useState<ClarityFilterState>({
    device: [],
    country: [],
    source: [],
    browser: [],
    os: []
  });

  const updateFilter = (key: keyof ClarityFilterState, values: string[]) => {
    setFilters(prev => ({ ...prev, [key]: values }));
  };

  return (
    <div
      className={cn(
        "rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card"
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Clarity Filter
        </h2>
        <p className="text-sm text-dark-6 dark:text-dark-4 mt-1">
          Filtrera data baserat på enhet, land, källa, webbläsare och operativsystem
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <FilterDropdown
          label="Enhet"
          items={[
            { value: "Desktop", label: "Desktop" },
            { value: "Mobil", label: "Mobil" },
            { value: "Surfplatta", label: "Surfplatta" },
          ]}
          values={filters.device}
          onChange={(values) => updateFilter("device", values)}
        />

        <FilterDropdown
          label="Land/Region"
          items={[
            { value: "SE", label: "Sverige" },
            { value: "NO", label: "Norge" },
            { value: "DK", label: "Danmark" },
            { value: "FI", label: "Finland" },
            { value: "DE", label: "Tyskland" },
            { value: "US", label: "USA" },
          ]}
          values={filters.country}
          onChange={(values) => updateFilter("country", values)}
        />

        <FilterDropdown
          label="Trafikkälla"
          items={[
            { value: "Direkt", label: "Direkt" },
            { value: "Organiskt", label: "Organiskt" },
            { value: "Kampanj", label: "Kampanj" },
            { value: "E-post", label: "E-post" },
            { value: "Social", label: "Social" },
            { value: "Referral", label: "Referral" },
          ]}
          values={filters.source}
          onChange={(values) => updateFilter("source", values)}
        />

        <FilterDropdown
          label="Webbläsare"
          items={[
            { value: "Chrome", label: "Chrome" },
            { value: "Safari", label: "Safari" },
            { value: "Firefox", label: "Firefox" },
            { value: "Edge", label: "Edge" },
            { value: "Opera", label: "Opera" },
          ]}
          values={filters.browser}
          onChange={(values) => updateFilter("browser", values)}
        />

        <FilterDropdown
          label="Operativsystem"
          items={[
            { value: "Windows", label: "Windows" },
            { value: "macOS", label: "macOS" },
            { value: "Linux", label: "Linux" },
            { value: "iOS", label: "iOS" },
            { value: "Android", label: "Android" },
          ]}
          values={filters.os}
          onChange={(values) => updateFilter("os", values)}
        />
      </div>

      {/* TODO: Connect filters to data fetching */}
      <div className="mt-4 text-xs text-dark-5 dark:text-dark-6">
        <strong>Obs:</strong> Filter är inte kopplade till datahämtning ännu. Mock-data används.
      </div>
    </div>
  );
}

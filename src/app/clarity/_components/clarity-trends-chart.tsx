"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type SeriesData = {
  name: string;
  data: { x: string; y: number }[];
  color: string;
};

type PropsType = {
  data: any[];
  series: SeriesData[];
  showDecimals?: boolean;
};

export function ClarityTrendsChart({ data, series, showDecimals = false }: PropsType) {
  const isMobile = useIsMobile();

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "inherit",
      fontWeight: 500,
      fontSize: "14px",
      markers: {
        size: 9,
        shape: "circle",
      },
    },
    colors: series.map(s => s.color),
    chart: {
      height: 300,
      type: "line",
      toolbar: {
        show: false,
      },
      fontFamily: "inherit",
    },
    stroke: {
      curve: "smooth",
      width: isMobile ? 2 : 3,
    },
    grid: {
      strokeDashArray: 5,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      marker: {
        show: true,
      },
      x: {
        formatter: function (val) {
          // Handle 3-day period format for tooltip
          if (val && typeof val === 'string' && val.includes(' - ')) {
            const [startDate, endDate] = val.split(' - ');
            const start = new Date(startDate);
            const end = new Date(endDate);
            const startStr = start.toLocaleDateString('sv-SE', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            });
            const endStr = end.toLocaleDateString('sv-SE', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            });
            return `${startStr} - ${endStr}`;
          } else {
            // Fallback for single date format
            const date = new Date(val);
            return date.toLocaleDateString('sv-SE', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            });
          }
        },
      },
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      type: "category",
      labels: {
        formatter: function (val) {
          // Handle 3-day period format (e.g., "2025-09-29 - 2025-10-01" -> "29 Sep - 1 Okt")
          if (val && typeof val === 'string' && val.includes(' - ')) {
            const [startDate, endDate] = val.split(' - ');
            const start = new Date(startDate);
            const end = new Date(endDate);
            const startStr = start.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
            const endStr = end.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
            return `${startStr} - ${endStr}`;
          } else {
            // Fallback for single date format
            const date = new Date(val);
            return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
          }
        },
      },
    },
    yaxis: {
      labels: {
        formatter: function (val) {
          return showDecimals ? val.toFixed(2) : Math.round(val).toString();
        },
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 250,
          },
        },
      },
      {
        breakpoint: 1366,
        options: {
          chart: {
            height: 280,
          },
        },
      },
    ],
  };

  return (
    <div className="-ml-4 -mr-5 h-[300px]">
      <Chart
        options={options}
        series={series.map(s => ({
          name: s.name,
          data: s.data,
        }))}
        type="line"
        height={300}
      />
    </div>
  );
}

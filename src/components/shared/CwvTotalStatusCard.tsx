import type { JSX, SVGProps } from "react";
import { CwvStatus } from "@/lib/types";

type PropsType = {
  label: string;
  data: {
    value: string;
    percentage: number;
    status: CwvStatus;
    target: string;
    description: string;
  };
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

// Helper function to get status chip styling
const getStatusChipStyle = (status: CwvStatus) => {
  switch (status) {
    case 'Pass':
      return "bg-green-light-6 text-green border border-green/20";
    case 'Needs Improvement':
      return "bg-yellow-light-4 text-yellow-dark border border-yellow/20";
    case 'Fail':
      return "bg-red-light-6 text-red border border-red/20";
    default:
      return "bg-neutral-200 text-neutral-600 border border-neutral-300";
  }
};

// Helper function to get status text
const getStatusText = (status: CwvStatus) => {
  switch (status) {
    case 'Pass':
      return 'Bra';
    case 'Needs Improvement':
      return 'Behöver förbättring';
    case 'Fail':
      return 'Misslyckad';
    default:
      return 'N/A';
  }
};

export function CwvTotalStatusCard({ label, data, Icon, ...rest }: PropsType & { onClick?: () => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3 cursor-pointer"
      role={rest.onClick ? "button" : undefined}
      tabIndex={rest.onClick ? 0 : undefined}
      aria-label={rest.onClick ? `${label} – öppna detaljer` : undefined}
      onClick={rest.onClick}
      onKeyDown={(e) => {
        if (!rest.onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          rest.onClick();
        }
      }}
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-orange" />
      
      <div className="p-6">
        {/* Header with icon and status chip */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg shadow-sm bg-orange/10">
            <Icon className="h-6 w-6 text-orange" />
          </div>
          
          {/* Status chip */}
          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${getStatusChipStyle(data.status)}`}>
            {getStatusText(data.status)}
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-2">
          <div className="text-3xl font-bold text-dark dark:text-white tracking-tight">
            {data.value}
          </div>
          <div className="text-sm font-medium text-dark-6 dark:text-dark-4">
            {label}
          </div>
        </div>

        {/* Goal and description */}
        <div className="mt-4 space-y-1">
          <div className="text-xs text-dark-5 dark:text-dark-6">
            Mål: {data.target}
          </div>
          <div className="text-xs text-dark-5 dark:text-dark-6">
            {data.description}
          </div>
        </div>

        {/* Source attribution */}
        <div className="mt-6 flex items-center gap-1 text-xs text-dark-5 dark:text-dark-6">
          <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
            <span className="text-[10px] font-bold">i</span>
          </div>
          Källa: Mock
        </div>
      </div>
    </div>
  );
}

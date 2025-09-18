import { ArrowDownIcon, ArrowUpIcon } from "@/assets/icons";
import { brandColors } from "@/lib/theme-tokens";
import { cn } from "@/lib/utils";
import type { JSX, SVGProps } from "react";

type ScoreCardProps = {
  label: string;
  value: number | string;
  growthRate?: number;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  source?: string;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  className?: string;
  onClick?: () => void; // optional, non-breaking
};

const variantStyles = {
  default: {
    accentBar: "bg-neutral-200",
    iconBg: "bg-neutral-100",
    iconColor: "text-neutral-600",
  },
  primary: {
    accentBar: "bg-primary",
    iconBg: "bg-primary/10", 
    iconColor: "text-primary",
  },
  success: {
    accentBar: "bg-green",
    iconBg: "bg-green/10",
    iconColor: "text-green",
  },
  warning: {
    accentBar: "bg-yellow-dark",
    iconBg: "bg-yellow-light-4",
    iconColor: "text-yellow-dark",
  },
  error: {
    accentBar: "bg-red",
    iconBg: "bg-red-light-6",
    iconColor: "text-red",
  },
  info: {
    accentBar: "bg-blue",
    iconBg: "bg-blue-light-5",
    iconColor: "text-blue",
  },
};

export function ScoreCard({ 
  label, 
  value, 
  growthRate, 
  Icon, 
  source,
  variant = "default",
  className,
  onClick,
}: ScoreCardProps) {
  const isDecreasing = growthRate !== undefined && growthRate < 0;
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3",
        onClick ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary" : "",
        className
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${label} – öppna detaljer` : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Accent bar - thicker and more prominent */}
      <div className={cn("absolute left-0 top-0 h-full w-1.5", styles.accentBar)} />
      
      <div className="p-6">
        {/* Header with icon and YoY chip */}
        <div className="flex items-start justify-between mb-6">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg shadow-sm",
            styles.iconBg
          )}>
            <Icon className={cn("h-6 w-6", styles.iconColor)} />
          </div>
          
          {/* YoY chip - improved styling */}
          {growthRate !== undefined && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
              isDecreasing 
                ? "bg-red-light-6 text-red border border-red/20" 
                : "bg-green-light-6 text-green border border-green/20"
            )}>
              {isDecreasing ? (
                <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowUpIcon className="h-3 w-3" aria-hidden="true" />
              )}
              {Math.abs(growthRate).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="space-y-2">
          <div className="text-3xl font-bold text-dark dark:text-white tracking-tight">
            {value}
          </div>
          <div className="text-sm font-medium text-dark-6 dark:text-dark-4">
            {label}
          </div>
        </div>

        {/* Source attribution with info icon */}
        {source && (
          <div className="mt-6 flex items-center gap-1 text-xs text-dark-5 dark:text-dark-6">
            <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
              <span className="text-[10px] font-bold">i</span>
            </div>
            Källa: {source}
          </div>
        )}
      </div>
    </div>
  );
}

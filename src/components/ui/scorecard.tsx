"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@/assets/icons";
import { brandColors } from "@/lib/theme-tokens";
import { cn } from "@/lib/utils";
import type { JSX, SVGProps } from "react";
import { MiniSparkline } from "./mini-sparkline";

type ScoreCardProps = {
  label: string;
  value: number | string;
  growthRate?: number;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  source?: string;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  className?: string;
  onClick?: () => void; // optional, non-breaking
  // Optional provider for inline sparkline
  getSeries?: (args: { start: string; end: string; grain: any; filters: any }) => Promise<{ x: number; y: number }[]>;
};

const variantStyles = {
  default: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
  primary: {
    accentBar: "bg-red",
    iconBg: "bg-red/10", 
    iconColor: "text-red",
  },
  success: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
  warning: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
  error: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
  info: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
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
  getSeries,
}: ScoreCardProps) {
  const isDecreasing = growthRate !== undefined && growthRate < 0;
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3",
        // Subtle affordance on hover/focus while respecting reduced motion
        "transition-transform transition-shadow duration-200 ease-out will-change-transform motion-reduce:transition-none motion-reduce:transform-none",
        "hover:shadow-md hover:border-primary/30 motion-reduce:hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "hover:scale-[1.01] focus-visible:scale-[1.01] motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100",
        onClick ? "cursor-pointer" : "",
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
      
      <div className="p-4">
        {/* Header with icon and YoY chip */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg shadow-sm",
            styles.iconBg
          )}>
            <Icon className={cn("h-5 w-5", styles.iconColor)} />
          </div>
          
          {/* YoY chip - improved styling */}
          {growthRate !== undefined && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm",
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
        <div className="space-y-1.5">
          <div className="text-2xl font-bold text-dark dark:text-white tracking-tight">
            {value}
          </div>
          <div className="text-base font-semibold text-dark dark:text-white/90">
            {label}
          </div>
        </div>

        {/* Inline sparkline reflecting active filters & date range */}
        <MiniSparkline
          getSeries={getSeries}
          className="mt-2"
          colorClassName={styles.iconColor.replace("text-", "text-")}
          height={28}
          amplify={3}
        />

        {/* Source attribution with info icon */}
        {source && (
          <div className="mt-4 flex items-center gap-1 text-xs text-dark-5 dark:text-dark-6">
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

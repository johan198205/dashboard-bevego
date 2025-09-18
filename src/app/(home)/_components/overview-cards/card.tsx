import { ScoreCard } from "@/components/ui/scorecard";
import type { JSX, SVGProps } from "react";

type PropsType = {
  label: string;
  data: {
    value: number | string;
    growthRate: number;
  };
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  appearance?: "default" | "analytics";
  comparisonLabel?: string;
};

export function OverviewCard({ label, data, Icon, variant = "default", appearance = "analytics", comparisonLabel, ...rest }: PropsType & { onClick?: () => void; getSeries?: any }) {
  // Force analytics appearance for all overview cards
  const finalAppearance = "analytics";
  return (
    <ScoreCard
      label={label}
      value={data.value}
      growthRate={data.growthRate}
      Icon={Icon}
      variant={variant}
      appearance={finalAppearance}
      comparisonLabel={comparisonLabel}
      source="Mock"
      getSeries={rest.getSeries}
      {...rest}
    />
  );
}

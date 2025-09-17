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
};

export function OverviewCard({ label, data, Icon, variant = "default" }: PropsType) {
  return (
    <ScoreCard
      label={label}
      value={data.value}
      growthRate={data.growthRate}
      Icon={Icon}
      variant={variant}
      source="Mock"
    />
  );
}

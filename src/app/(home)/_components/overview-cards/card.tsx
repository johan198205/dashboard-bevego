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

export function OverviewCard({ label, data, Icon, variant = "default", ...rest }: PropsType & { onClick?: () => void; getSeries?: any }) {
  return (
    <ScoreCard
      label={label}
      value={data.value}
      growthRate={data.growthRate}
      Icon={Icon}
      variant={variant}
      source="Mock"
      // @ts-expect-error pass through getSeries used by sparkline
      getSeries={rest.getSeries}
      {...rest}
    />
  );
}

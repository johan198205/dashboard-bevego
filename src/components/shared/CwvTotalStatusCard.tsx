import type { JSX, SVGProps } from "react";
import { CwvStatus } from "@/lib/types";
import { ScoreCard } from "@/components/ui/scorecard";

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
  comparisonLabel?: string;
};


export function CwvTotalStatusCard({ label, data, Icon, comparisonLabel = "vs. previous period", ...rest }: PropsType & { onClick?: () => void }) {
  return (
    <ScoreCard
      label={label}
      value={data.value}
      growthRate={0} // CWV doesn't have growth rate, set to 0
      Icon={Icon}
      variant="default"
      appearance="analytics"
      comparisonLabel={comparisonLabel}
      source="Mock"
      onClick={rest.onClick}
    />
  );
}

import type { JSX, SVGProps } from "react";
import { ScoreCard } from "@/components/ui/scorecard";

type PropsType = {
  label: string;
  data: {
    value: string;
    growthRate: number;
    grade: 'Bra' | 'Behöver förbättras' | 'Dålig' | 'N/A';
  };
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  comparisonLabel?: string;
};


export function ClarityScoreCard({ label, data, Icon, comparisonLabel = "vs. previous period", ...rest }: PropsType & { onClick?: () => void }) {
  return (
    <ScoreCard
      label={label}
      value={data.value}
      growthRate={data.growthRate}
      Icon={Icon}
      variant="default"
      appearance="analytics"
      comparisonLabel={comparisonLabel}
      source="Mock"
      onClick={rest.onClick}
    />
  );
}

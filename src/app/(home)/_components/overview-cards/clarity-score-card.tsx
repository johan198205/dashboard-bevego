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
  comparisonLabel?: string | null;
};


export function ClarityScoreCard({ label, data, Icon, comparisonLabel = "vs. föregående period", ...rest }: PropsType & { onClick?: () => void }) {
  // TODO replace with UI settings
  const KPI_ANNUAL_GOALS = {
    clarity_score: 80, // Clarity Score (out of 100)
  };
  
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
      showProgress={true}
      progressGoal={KPI_ANNUAL_GOALS.clarity_score}
      progressUnit=""
      onClick={rest.onClick}
    />
  );
}

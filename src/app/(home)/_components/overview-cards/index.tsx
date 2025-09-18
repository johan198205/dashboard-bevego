"use client";

import { useEffect, useState } from "react";
import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import { ClarityScoreCard } from "./clarity-score-card";
import { CwvTotalStatusCard } from "@/components/shared/CwvTotalStatusCard";
import { useCwvData } from "@/hooks/useCwvData";
import { useClarityData } from "@/hooks/useClarityData";
import * as icons from "./icons";

type OverviewData = {
  views: { value: number; growthRate: number };
  profit: { value: number; growthRate: number };
  products: { value: number; growthRate: number };
  users: { value: number; growthRate: number };
};

export function OverviewCardsGroup() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const { summary: cwvSummary, loading: cwvLoading } = useCwvData();
  const { clarityScore, loading: clarityLoading } = useClarityData();

  useEffect(() => {
    const loadData = async () => {
      const overview = await getOverviewData();
      setOverviewData(overview);
    };
    loadData();
  }, []);

  if (!overviewData || clarityLoading || cwvLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const { views, profit, products, users } = overviewData;

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      {/* Clarity Score - First and most prominent card */}
      {clarityScore && (
        <ClarityScoreCard
          label="Clarity Score"
          data={{
            value: `${clarityScore.score} / 100`,
            growthRate: 0, // TODO: Add growth rate to clarity score
            grade: clarityScore.grade
          }}
          Icon={icons.ClarityScore}
        />
      )}

      {/* CWV Total Status - Second prominent card */}
      {cwvSummary && (
        <CwvTotalStatusCard
          label="CWV total status"
          data={{
            value: `${cwvSummary.totalStatus.percentage}%`,
            percentage: cwvSummary.totalStatus.percentage,
            status: cwvSummary.totalStatus.percentage >= 75 ? 'Pass' : 'Needs Improvement',
            target: "> 75%",
            description: "Klarar alla tre"
          }}
          Icon={icons.CwvTotalStatus}
        />
      )}

      <OverviewCard
        label="Total Views"
        data={{
          ...views,
          value: compactFormat(views.value),
        }}
        Icon={icons.Views}
        variant="success"
      />

      <OverviewCard
        label="Total Profit"
        data={{
          ...profit,
          value: "$" + compactFormat(profit.value),
        }}
        Icon={icons.Profit}
        variant="warning"
      />

      <OverviewCard
        label="Total Products"
        data={{
          ...products,
          value: compactFormat(products.value),
        }}
        Icon={icons.Product}
        variant="info"
      />

      <OverviewCard
        label="Total Users"
        data={{
          ...users,
          value: compactFormat(users.value),
        }}
        Icon={icons.Users}
        variant="primary"
      />
    </div>
  );
}

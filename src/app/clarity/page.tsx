import { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { ClarityOverview } from "./_components/clarity-overview";
import { ClarityTrends } from "./_components/clarity-trends";
import { ClarityTable } from "./_components/clarity-table";
import { ClarityInsights } from "./_components/clarity-insights";
import { ClarityFilters } from "./_components/clarity-filters";

export const metadata: Metadata = {
  title: "Clarity - Microsoft Clarity Analytics",
  description: "Microsoft Clarity analytics dashboard showing user behavior insights, rage clicks, dead clicks, and engagement metrics.",
};

export default function ClarityPage() {
  return (
    <>
      <Breadcrumb pageName="Clarity" />
      
      <div className="space-y-6">
        {/* Overview/Scorecards Section */}
        <ClarityOverview />
        
        {/* Trends Section */}
        <ClarityTrends />
        
        {/* Filters Section */}
        <ClarityFilters />
        
        {/* URL Table Section */}
        <ClarityTable />
        
        {/* Insights Section */}
        <ClarityInsights />
      </div>
    </>
  );
}

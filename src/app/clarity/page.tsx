import { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { ClarityOverviewNew } from "./_components/clarity-overview-new";
import { ClarityTrends } from "./_components/clarity-trends";

export const metadata: Metadata = {
  title: "Clarity - Microsoft Clarity Analytics",
  description: "Microsoft Clarity analytics dashboard showing user behavior insights, rage clicks, dead clicks, and engagement metrics.",
};

export default function ClarityPage() {
  return (
    <>
      <Breadcrumb pageName="Clarity" />
      
      <div className="space-y-6">
        {/* Information about 3-day periods */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Data baseras på 3-dagars perioder
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Microsoft Clarity API tillhandahåller data i 3-dagars perioder. När du väljer ett datumintervall 
                  visas data grupperad i 3-dagars block. Längre perioder delas upp i flera 3-dagars perioder.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Overview/Scorecards Section */}
        <ClarityOverviewNew />
        
        {/* Trends Section */}
        <ClarityTrends />
      </div>
    </>
  );
}

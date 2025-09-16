import { PaymentsOverview } from "@/components/Charts/payments-overview";
import { UsedDevices } from "@/components/Charts/used-devices";
import { WeeksProfit } from "@/components/Charts/weeks-profit";
import { TopChannels } from "@/components/Tables/top-channels";
import { TopChannelsSkeleton } from "@/components/Tables/top-channels/skeleton";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";
import { Suspense } from "react";
import SourceToggle from "@/components/SourceToggle";
import SessionsTotalCard from "@/components/SessionsTotalCard";
import { ChatsCard } from "./_components/chats-card";
import { OverviewCardsGroup } from "./_components/overview-cards";
import { OverviewCardsSkeleton } from "./_components/overview-cards/skeleton";
import { RegionLabels } from "./_components/region-labels";

type PropsType = {
  searchParams: Promise<{
    selected_time_frame?: string;
    ds?: "ga4" | "bq";
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
  }>;
};

export default async function Home({ searchParams }: PropsType) {
  const { selected_time_frame, ds, from, to } = await searchParams;
  const extractTimeFrame = createTimeFrameExtractor(selected_time_frame);
  const dataSource = ds === "bq" ? "bq" : "ga4";
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const defaultTo = iso(today);
  const defaultFrom = iso(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)); // 7 dagar
  const startDate = from || defaultFrom;
  const endDate = to || defaultTo;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between 2xl:mb-9">
        <div className="flex items-center gap-3">
          <SourceToggle value={dataSource} />
        </div>
        <DateRangeControls startDate={startDate} endDate={endDate} />
      </div>
      <Suspense fallback={<OverviewCardsSkeleton />}>
        <OverviewCardsGroup />
      </Suspense>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        <SessionsTotalCard
          className="col-span-12 md:col-span-6 xl:col-span-4"
          startDate={startDate}
          endDate={endDate}
          dataSource={dataSource}
        />

        <PaymentsOverview
          className="col-span-12 xl:col-span-7"
          key={extractTimeFrame("payments_overview")}
          timeFrame={extractTimeFrame("payments_overview")?.split(":")[1]}
        />

        <WeeksProfit
          key={extractTimeFrame("weeks_profit")}
          timeFrame={extractTimeFrame("weeks_profit")?.split(":")[1]}
          className="col-span-12 xl:col-span-5"
        />

        <UsedDevices
          className="col-span-12 xl:col-span-5"
          key={extractTimeFrame("used_devices")}
          timeFrame={extractTimeFrame("used_devices")?.split(":")[1]}
        />

        <RegionLabels />

        <div className="col-span-12 grid xl:col-span-8">
          <Suspense fallback={<TopChannelsSkeleton />}>
            <TopChannels />
          </Suspense>
        </div>

        <Suspense fallback={null}>
          <ChatsCard />
        </Suspense>
      </div>
    </>
  );
}

function DateRangeControls({ startDate, endDate }: { startDate: string; endDate: string }) {
  // Client-free URL form: uses GET and defaults; minimal styling, reuse existing classes
  const action = "";
  return (
    <form method="get" action={action} className="flex items-center gap-2">
      <input
        type="date"
        name="from"
        defaultValue={startDate}
        className="rounded-md border border-[#E8E8E8] bg-white px-3 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
      />
      <span className="text-sm text-dark-4 dark:text-dark-6">–</span>
      <input
        type="date"
        name="to"
        defaultValue={endDate}
        className="rounded-md border border-[#E8E8E8] bg-white px-3 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
      />
      {/* Preserve other params in URL (selected_time_frame, ds) */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <input type="hidden" name="ds" value={dataSourceFromSearch()} />
      <button
        type="submit"
        className="rounded-md border px-3 py-1 text-sm bg-white dark:bg-dark-2"
      >
        Apply
      </button>
    </form>
  );
}

function dataSourceFromSearch(): "ga4" | "bq" {
  // Hydration-safe default (server render only)
  return "ga4";
}

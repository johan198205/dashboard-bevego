import PerfCard from "@/widgets/PerfCard";
import WcagCard from "@/widgets/WcagCard";
import CoreWebVitals from "@/widgets/CoreWebVitals";

export default function Page() {
  return (
    <div className="space-y-8">
      {/* Existing performance cards */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Prestanda
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <PerfCard title="Svarstid" value="420 ms" note="Informativt tomläge (mock)." />
          <PerfCard title="Uptime" value="99,6%" note="Informativt tomläge (mock)." />
          <WcagCard />
        </div>
      </div>

      {/* Core Web Vitals section */}
      <CoreWebVitals />
    </div>
  );
}



import PerfCard from "@/widgets/PerfCard";
import WcagCard from "@/widgets/WcagCard";

export default function Page() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <PerfCard title="Svarstid" value="420 ms" note="Informativt tomläge (mock)." />
      <PerfCard title="Uptime" value="99,6%" note="Informativt tomläge (mock)." />
      <WcagCard />
    </div>
  );
}



export default function PerfCard({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="card">
      <div className="title mb-1">{title}</div>
      <div className="value">{value}</div>
      {note && <div className="mt-1 text-xs text-gray-500">{note}</div>}
      <div className="mt-2"><span className="badge">Källa: Mock</span></div>
    </div>
  );
}



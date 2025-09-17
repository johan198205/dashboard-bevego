"use client";
export default function SourceToggle() {
  return (
    <div className="card flex items-center gap-3">
      <span className="title">Källa</span>
      <span className="badge bg-green-100 text-green-800">Mock (aktiv)</span>
      <button className="badge opacity-50 cursor-not-allowed" title="Inte tillgängligt ännu">GA4</button>
      <button className="badge opacity-50 cursor-not-allowed" title="Inte tillgängligt ännu">BQ</button>
    </div>
  );
}


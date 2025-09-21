"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AreaBreakdown } from "@/types/ndi";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { XIcon, TrendingUpIcon, UserIcon, GlobeIcon, MessageOutlineIcon } from "@/assets/icons";

interface NDIAreaBreakdownDrawerProps {
  open: boolean;
  onClose: () => void;
  area: string;
  period: string;
}

interface BreakdownCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function BreakdownCard({ title, icon, children, className }: BreakdownCardProps) {
  return (
    <div className={cn("bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-red/10 text-red">
            <span className="scale-75">{icon}</span>
          </span>
        )}
        <h3 className="text-sm font-semibold text-dark dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

interface GenderBreakdownCardProps {
  data: AreaBreakdown['gender'];
}

function GenderBreakdownCard({ data }: GenderBreakdownCardProps) {
  if (!data) return <div className="text-sm text-gray-600 dark:text-dark-4">N/A</div>;

  const deltaColor = data.delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const deltaSign = data.delta > 0 ? '+' : '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="font-medium text-dark dark:text-white">Män</div>
            <div className="text-gray-600 dark:text-dark-4">
              NDI: {data.male.ndi.toFixed(1)}
              {data.male.count && ` (${data.male.count})`}
            </div>
          </div>
        </div>
        <div className="text-sm">
          <div className="font-medium text-dark dark:text-white">Kvinnor</div>
          <div className="text-gray-600 dark:text-dark-4">
            NDI: {data.female.ndi.toFixed(1)}
            {data.female.count && ` (${data.female.count})`}
          </div>
        </div>
      </div>
      <div className={cn("text-sm font-medium", deltaColor)}>
        Δ {deltaSign}{data.delta.toFixed(1)} p.p. (Män - Kvinnor)
      </div>
    </div>
  );
}

interface AgeGroupBreakdownCardProps {
  data: AreaBreakdown['ageGroups'];
}

function AgeGroupBreakdownCard({ data }: AgeGroupBreakdownCardProps) {
  if (!data) return <div className="text-sm text-gray-600 dark:text-dark-4">N/A</div>;

  const ageGroups = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-2">
      {ageGroups.map(([ageGroup, stats]) => (
        <div key={ageGroup} className="flex items-center justify-between">
          <span className="text-sm font-medium text-dark dark:text-white">{ageGroup} år</span>
          <div className="text-sm text-gray-600 dark:text-dark-4">
            NDI: {stats.ndi.toFixed(1)}
            {stats.count && ` (${stats.count})`}
          </div>
        </div>
      ))}
    </div>
  );
}

interface DeviceBreakdownCardProps {
  data: AreaBreakdown['device'];
}

function DeviceBreakdownCard({ data }: DeviceBreakdownCardProps) {
  if (!data) return <div className="text-sm text-gray-600 dark:text-dark-4">N/A</div>;

  const delta = data.desktop.ndi - data.mobile.ndi;
  const deltaColor = delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const deltaSign = delta > 0 ? '+' : '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium text-dark dark:text-white">Mobil</div>
          <div className="text-gray-600 dark:text-dark-4">
            NDI: {data.mobile.ndi.toFixed(1)}
            {data.mobile.count && ` (${data.mobile.count})`}
          </div>
        </div>
        <div className="text-sm">
          <div className="font-medium text-dark dark:text-white">Desktop</div>
          <div className="text-gray-600 dark:text-dark-4">
            NDI: {data.desktop.ndi.toFixed(1)}
            {data.desktop.count && ` (${data.desktop.count})`}
          </div>
        </div>
      </div>
      <div className={cn("text-sm font-medium", deltaColor)}>
        Δ {deltaSign}{delta.toFixed(1)} p.p. (Desktop - Mobil)
      </div>
    </div>
  );
}

interface OSBreakdownCardProps {
  data: AreaBreakdown['os'];
}

function OSBreakdownCard({ data }: OSBreakdownCardProps) {
  if (!data) return <div className="text-sm text-gray-600 dark:text-dark-4">N/A</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-dark dark:text-white">Android</span>
        <div className="text-sm text-gray-600 dark:text-dark-4">
          NDI: {data.android.ndi.toFixed(1)}
          {data.android.count && ` (${data.android.count})`}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-dark dark:text-white">iOS</span>
        <div className="text-sm text-gray-600 dark:text-dark-4">
          NDI: {data.ios.ndi.toFixed(1)}
          {data.ios.count && ` (${data.ios.count})`}
        </div>
      </div>
    </div>
  );
}

interface BrowserBreakdownCardProps {
  data: AreaBreakdown['browser'];
}

function BrowserBreakdownCard({ data }: BrowserBreakdownCardProps) {
  if (!data) return <div className="text-sm text-gray-600 dark:text-dark-4">N/A</div>;

  return (
    <div className="space-y-2">
      {Object.entries(data).map(([browser, stats]) => (
        <div key={browser} className="flex items-center justify-between">
          <span className="text-sm font-medium text-dark dark:text-white capitalize">{browser}</span>
          <div className="text-sm text-gray-600 dark:text-dark-4">
            NDI: {stats.ndi.toFixed(1)}
            {stats.count && ` (${stats.count})`}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ResponseDistributionCardProps {
  data: AreaBreakdown['responseDistribution'];
}

function ResponseDistributionCard({ data }: ResponseDistributionCardProps) {
  if (!data) return <div className="text-sm text-gray-600 dark:text-dark-4">N/A</div>;

  const responses = Object.entries(data)
    .map(([rating, stats]) => ({ rating: parseInt(rating), ...stats }))
    .sort((a, b) => a.rating - b.rating);

  return (
    <div className="space-y-3">
      {responses.map((response) => (
        <div key={response.rating} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-dark dark:text-white">
              {response.rating}. {response.label}
            </span>
            <span className="text-sm text-gray-600 dark:text-dark-4">
              {response.count} ({response.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-red h-2 rounded-full" 
              style={{ width: `${response.percentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-dark-4">
            NDI-bidrag: {response.ndiContribution.toFixed(1)} p.p.
          </div>
        </div>
      ))}
    </div>
  );
}

export function NDIAreaBreakdownDrawer({ open, onClose, area, period }: NDIAreaBreakdownDrawerProps) {
  const [breakdown, setBreakdown] = useState<AreaBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Start enter animation on next frame
    setShow(false);
    const id = requestAnimationFrame(() => setShow(true));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKey);

    // Fetch breakdown data
    const fetchBreakdown = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/metrics/ndi/area-breakdown?period=${period}&area=${encodeURIComponent(area)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch breakdown data');
        }

        const data = await response.json();
        setBreakdown(data);
      } catch (err) {
        console.error('Error fetching breakdown:', err);
        setError('Ett fel uppstod vid hämtning av nedbrytningsdata');
      } finally {
        setLoading(false);
      }
    };

    fetchBreakdown();

    // Body lock to ensure only drawer scrolls
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first focusable
    setTimeout(() => closeBtnRef.current?.focus(), 10);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
      setShow(false);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, area, period]);

  function handleClose() {
    setShow(false);
    setTimeout(() => onClose(), 220);
  }

  // Focus trap within drawer
  const onKeyDownTrap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = drawerRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      (last as HTMLElement).focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      (first as HTMLElement).focus();
    }
  };

  if (!open) return null;

  const drawer = (
    <div className="fixed inset-0 z-[10050] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-describedby="drawer-desc">
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        className={`relative h-full w-full max-w-[720px] overflow-y-auto bg-white shadow-2xl transition-transform duration-200 ease-out dark:bg-gray-dark ${show ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Area breakdown details"
        ref={drawerRef as any}
        onKeyDown={onKeyDownTrap}
      >
        <header className="sticky top-0 z-10 border-b border-dark-3/10 bg-white/95 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-gray-dark/95">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red/10 text-red">
                <MessageOutlineIcon />
              </span>
              <div>
                <h2 id="drawer-title" className="text-xl font-semibold text-dark dark:text-white">
                  {area}
                </h2>
                <div id="drawer-desc" className="mt-0.5 flex items-center gap-2 text-xs text-gray-600 dark:text-dark-5">
                  <span>Period: {period.replace('Q', ' Q')}</span>
                  {breakdown?.totalResponses && (
                    <>
                      <span>•</span>
                      <span>{breakdown.totalResponses} svar</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button 
              ref={closeBtnRef as any} 
              className="rounded-full border border-dark-3/30 p-2 text-gray-600 hover:bg-dark-2/10 focus:outline-none focus:ring-2 focus:ring-red dark:border-white/15 dark:text-white/80" 
              onClick={handleClose} 
              aria-label="Stäng"
            >
              <XIcon />
            </button>
          </div>
        </header>

        <div className="px-6 pt-4 pb-28">
          {/* Summary Section */}
          {!loading && breakdown && (
            <div className="mb-6 bg-gradient-to-r from-red/5 to-red/10 border border-red/20 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-dark dark:text-white mb-1">
                    Sammanfattning för {period.replace('Q', ' Q')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-dark-4">
                    Total NDI och svarsstatistik
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red dark:text-red-400 mb-1">
                    {breakdown.totalNDI ? breakdown.totalNDI.toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-sm font-medium text-dark dark:text-white">
                    NDI Poäng
                  </div>
                  <div className="text-sm text-gray-600 dark:text-dark-4">
                    {breakdown.totalResponses || 0} svar
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                {error}
              </h3>
            </div>
          ) : breakdown ? (
            <div className="space-y-4">
              {/* Gender */}
              <BreakdownCard title="Kön" icon={<UserIcon />}>
                <GenderBreakdownCard data={breakdown.gender} />
              </BreakdownCard>

              {/* Age Groups */}
              <BreakdownCard title="Åldersgrupper" icon={<TrendingUpIcon />}>
                <AgeGroupBreakdownCard data={breakdown.ageGroups} />
              </BreakdownCard>

              {/* Device */}
              <BreakdownCard title="Enhet" icon={<GlobeIcon />}>
                <DeviceBreakdownCard data={breakdown.device} />
              </BreakdownCard>

              {/* Operating System */}
              <BreakdownCard title="Operativsystem" icon={<GlobeIcon />}>
                <OSBreakdownCard data={breakdown.os} />
              </BreakdownCard>

              {/* Browser */}
              <BreakdownCard title="Webbläsare" icon={<GlobeIcon />}>
                <BrowserBreakdownCard data={breakdown.browser} />
              </BreakdownCard>

              {/* Response Distribution */}
              <BreakdownCard title="Svarsfördelning 1-5" icon={<MessageOutlineIcon />}>
                <ResponseDistributionCard data={breakdown.responseDistribution} />
              </BreakdownCard>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                Ingen data tillgänglig
              </h3>
              <p className="text-gray-600 dark:text-dark-4">
                Nedbrytningsdata saknas för detta område
              </p>
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-dark-3/10 bg-white/95 px-6 py-3 backdrop-blur dark:border-white/10 dark:bg-gray-dark/95">
          <div className="flex gap-2">
            <button className="cursor-not-allowed rounded-lg bg-dark-2/10 px-3 py-2 text-sm text-gray-600 dark:bg-white/10 dark:text-white/50" disabled>
              Exportera
            </button>
            <button className="cursor-not-allowed rounded-lg bg-dark-2/10 px-3 py-2 text-sm text-gray-600 dark:bg-white/10 dark:text-white/50" disabled>
              Kopiera
            </button>
          </div>
          <button className="rounded-lg bg-red px-4 py-2 text-sm font-medium text-white hover:bg-red/90" onClick={handleClose}>
            Stäng
          </button>
        </footer>
      </aside>
    </div>
  );

  // Render at document.body to escape any local stacking context
  return typeof window !== "undefined" ? createPortal(drawer, document.body) : null;
}

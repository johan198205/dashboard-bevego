"use client";

import { useEffect, useMemo, useState } from "react";
import { makeCacheKey, getCached, setCached } from "@/lib/utils";
import { useFilters } from "@/components/GlobalFilters";

type UseKpiOptions = {
  metric: string;
  ttlMs?: number; // cache time, default 5 min
};

type KpiSummary = { value: number | string; growthRate: number };

export function useKpi({ metric, ttlMs = 5 * 60 * 1000 }: UseKpiOptions) {
  const { state } = useFilters();
  const { range, audience, device, channel } = state as any;

  const params = useMemo(() => {
    // NDI should always compare against previous quarter on the KPI card,
    // regardless of global comparison setting. Force 'prev' for NDI.
    const effectiveComparison = metric === "ndi" ? "prev" : (range.comparisonMode || "yoy");
    return {
      metric,
      start: range.start,
      end: range.end,
      grain: range.grain || "day",
      comparisonMode: effectiveComparison,
      audience,
      device,
      channel,
    };
  }, [metric, range.start, range.end, range.grain, range.comparisonMode, audience, device, channel]);

  const cacheKey = useMemo(() => makeCacheKey({ type: "kpi", ...params }), [params]);

  const [data, setData] = useState<KpiSummary | null>(() => getCached<KpiSummary>(cacheKey));
  const [loading, setLoading] = useState<boolean>(!getCached<KpiSummary>(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const cached = getCached<KpiSummary>(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const search = new URLSearchParams({
      metric: params.metric,
      start: params.start,
      end: params.end,
      grain: params.grain,
      comparisonMode: params.comparisonMode,
    });
    // Pass multi-select filters as comma-separated lists
    if ((params.audience as string[] | undefined)?.length) {
      search.set('audience', (params.audience as string[]).join(','));
    }
    if ((params.device as string[] | undefined)?.length) {
      search.set('device', (params.device as string[]).join(','));
    }
    if ((params.channel as string[] | undefined)?.length) {
      search.set('channel', (params.channel as string[]).join(','));
    }

    fetch(`${window.location.origin}/api/kpi?${search.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const valueRaw = json.summary.current;
        const summary: KpiSummary = {
          value: valueRaw,
          growthRate: json.summary.yoyPct ?? 0,
        };
        if (!cancelled) {
          setCached(cacheKey, summary, ttlMs);
          setData(summary);
          const src = (json.notes || []).find?.((n: string) => n.startsWith("Källa:"))?.replace("Källa:", "").trim();
          setSource(src);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Unknown error");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, params, ttlMs]);

  return { data, loading, error, source };
}



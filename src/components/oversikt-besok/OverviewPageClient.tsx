'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HeaderFilters } from './HeaderFilters';
import { KpiCards } from './KpiCards';
import { Trends } from './Trends';
import { Distributions } from './Distributions';
import { UsageHeatmap } from './UsageHeatmap';
import { TopPages } from './TopPages';
import { GeoTopCities } from './GeoTopCities';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import type { OverviewPayload } from '@/app/api/ga4/overview/route';

type SearchParams = {
  start?: string;
  end?: string;
  compare?: string;
  channel?: string;
  device?: string;
  role?: string;
  unit?: string;
};

type Props = {
  initialApiUrl: string;
  searchParams: SearchParams;
  initialData?: OverviewPayload | null;
  initialError?: string | null;
};

export function OverviewPageClient({ initialApiUrl, searchParams, initialData, initialError }: Props) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [data, setData] = useState<OverviewPayload | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData && !initialError);
  const [error, setError] = useState<string | null>(initialError || null);
  const [apiUrl, setApiUrl] = useState(initialApiUrl);

  // Fetch data from API
  const fetchData = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure we have a full URL for client-side fetching
      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result: OverviewPayload = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch GA4 data:', err);
      setError(err instanceof Error ? err.message : 'Okänt fel');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch (only if we don't have initial data)
  useEffect(() => {
    if (!initialData && !initialError) {
      fetchData(apiUrl);
    }
  }, [apiUrl, initialData, initialError]);

  // Update URL when filters change
  const updateFilters = (newFilters: Partial<SearchParams>) => {
    const current = new URLSearchParams(urlSearchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'Alla') {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const newUrl = `/oversikt/besok?${current.toString()}`;
    router.push(newUrl);
    
    // Update API URL for next fetch
    const apiParams = new URLSearchParams();
    apiParams.set('start', newFilters.start || searchParams.start || getDefaultStartDate());
    apiParams.set('end', newFilters.end || searchParams.end || getDefaultEndDate());
    apiParams.set('compare', newFilters.compare || searchParams.compare || 'yoy');
    
    if (newFilters.channel) apiParams.set('channel', newFilters.channel);
    if (newFilters.device) apiParams.set('device', newFilters.device);
    if (newFilters.role) apiParams.set('role', newFilters.role);
    if (newFilters.unit) apiParams.set('unit', newFilters.unit);
    
    setApiUrl(`/api/ga4/overview?${apiParams.toString()}`);
  };

  // Helper functions for default dates (senaste 28 dagarna)
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 28);
    return date.toISOString().slice(0, 10);
  }

  function getDefaultEndDate() {
    return new Date().toISOString().slice(0, 10);
  }

  // React to URL search param changes (browser back/forward or edits)
  useEffect(() => {
    const sp = new URLSearchParams(urlSearchParams.toString());
    const start = sp.get('start') || getDefaultStartDate();
    const end = sp.get('end') || getDefaultEndDate();
    const compare = sp.get('compare') || 'yoy';
    const channel = sp.get('channel') || undefined;
    const device = sp.get('device') || undefined;
    const role = sp.get('role') || undefined;
    const unit = sp.get('unit') || undefined;

    const params = new URLSearchParams({ start, end, compare });
    if (channel) params.set('channel', channel);
    if (device) params.set('device', device);
    if (role) params.set('role', role);
    if (unit) params.set('unit', unit);

    const nextUrl = `/api/ga4/overview?${params.toString()}`;
    setApiUrl(nextUrl);
    // Trigger fetch when URL search params change
    fetchData(nextUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearchParams]);

  // Retry function
  const handleRetry = () => {
    fetchData(apiUrl);
  };

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Kunde inte hämta data från GA4: {error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Försök igen
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KpiCards data={data.summary} />

      {/* Trends Chart */}
      <Trends data={data.timeseries} />

      {/* Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Distributions 
          title="Kanaler"
          data={data.channels}
          type="channel"
        />
        <Distributions 
          title="Enheter"
          data={data.devices}
          type="device"
        />
      </div>

      {/* Usage Heatmap */}
      <UsageHeatmap data={data.weekdayHour} />

      {/* Top Pages and Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPages data={data.topPages} />
        <GeoTopCities data={data.cities} />
      </div>

      {/* Data source info */}
      {data.summary.sampled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Data kan vara samplad på grund av höga volymer. Vissa värden kan vara uppskattningar.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

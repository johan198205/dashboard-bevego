'use client';

import { useState, useEffect } from 'react';
import { KpiCards } from './KpiCards';
import { Trends } from './Trends';
import { Distributions } from './Distributions';
import { UsageHeatmap } from './UsageHeatmap';
import { GeoTopCities } from './GeoTopCities';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useFilters } from '@/components/GlobalFilters';
import type { OverviewPayload } from '@/app/api/ga4/overview/route';

type Props = {
  initialData?: OverviewPayload | null;
  initialError?: string | null;
};

export function OverviewPageClient({ initialData, initialError }: Props) {
  const { state: filterState } = useFilters();
  const [data, setData] = useState<OverviewPayload | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData && !initialError);
  const [error, setError] = useState<string | null>(initialError || null);
  // Which metrics are shown in the timeline chart
  const [activeSeries, setActiveSeries] = useState<{
    sessions: boolean;
    totalUsers: boolean;
    returningUsers: boolean;
    engagedSessions: boolean;
    engagementRatePct: boolean;
    avgEngagementTimeSec: boolean;
    pageviews: boolean;
  }>({
    sessions: true,
    totalUsers: true,
    returningUsers: false,
    engagedSessions: false,
    engagementRatePct: false,
    avgEngagementTimeSec: false,
    pageviews: false,
  });

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

  // Auto-apply: Fetch data when filters change (same pattern as KPI dashboard)
  useEffect(() => {
    // Abort any in-flight requests on filter change
    const controller = new AbortController();
    
    const buildApiUrl = () => {
      const params = new URLSearchParams({
        start: filterState.range.start,
        end: filterState.range.end,
        compare: filterState.range.comparisonMode || 'yoy',
      });
      
      // Map global filter state to GA4 API parameters
      if (filterState.channel.length > 0) {
        params.set('channel', filterState.channel.join(','));
      }
      if (filterState.device.length > 0) {
        // Map device names to GA4 format
        const deviceMap: Record<string, string> = { 
          'Desktop': 'desktop', 
          'Mobil': 'mobile', 
          'Surfplatta': 'tablet' 
        };
        const mappedDevices = filterState.device.map(d => deviceMap[d] || d);
        params.set('device', mappedDevices.join(','));
      }
      if (filterState.audience.length > 0) {
        params.set('role', filterState.audience.join(','));
      }
      
      return `/api/ga4/overview?${params.toString()}`;
    };

    setLoading(true);
    setError(null);
    
    const fetchWithAbort = async () => {
      try {
        const fullUrl = `${window.location.origin}${buildApiUrl()}`;
        const response = await fetch(fullUrl, { signal: controller.signal });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result: OverviewPayload = await response.json();
        setData(result);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.debug('[OverviewPageClient] Request aborted');
          return;
        }
        console.error('Failed to fetch GA4 data:', err);
        setError(err instanceof Error ? err.message : 'Okänt fel');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWithAbort();
    
    return () => {
      controller.abort();
    };
  }, [filterState.range.start, filterState.range.end, filterState.range.comparisonMode, filterState.channel, filterState.device, filterState.audience]);

  // Initial data fetch (only if we don't have initial data)
  useEffect(() => {
    if (!initialData && !initialError) {
      const apiUrl = `/api/ga4/overview?${new URLSearchParams({
        start: filterState.range.start,
        end: filterState.range.end,
        compare: filterState.range.comparisonMode || 'yoy',
      }).toString()}`;
      fetchData(apiUrl);
    }
  }, [initialData, initialError, filterState.range.start, filterState.range.end, filterState.range.comparisonMode]);

  // Retry function - rebuild API URL from current filter state
  const handleRetry = () => {
    const params = new URLSearchParams({
      start: filterState.range.start,
      end: filterState.range.end,
      compare: filterState.range.comparisonMode || 'yoy',
    });
    
    if (filterState.channel.length > 0) {
      params.set('channel', filterState.channel.join(','));
    }
    if (filterState.device.length > 0) {
      const deviceMap: Record<string, string> = { 
        'Desktop': 'desktop', 
        'Mobil': 'mobile', 
        'Surfplatta': 'tablet' 
      };
      const mappedDevices = filterState.device.map(d => deviceMap[d] || d);
      params.set('device', mappedDevices.join(','));
    }
    if (filterState.audience.length > 0) {
      params.set('role', filterState.audience.join(','));
    }
    
    const apiUrl = `/api/ga4/overview?${params.toString()}`;
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
      <KpiCards 
        data={data.summary} 
        activeSeries={activeSeries}
        onToggleSeries={(key: keyof typeof activeSeries, value: boolean) => setActiveSeries((prev) => ({ ...prev, [key]: value }))}
      />

      {/* Trends Chart */}
      <Trends data={data.timeseries} activeSeries={activeSeries} />

      {/* Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Distributions 
          title="Kanaler"
          data={data.channels}
          type="channel"
          totalSessions={data.summary.sessions}
        />
        <Distributions 
          title="Enheter"
          data={data.devices}
          type="device"
          totalSessions={data.summary.sessions}
        />
      </div>

      {/* Usage Heatmap */}
      <UsageHeatmap data={data.weekdayHour} />

      {/* Cities Table */}
      <div className="grid grid-cols-1 gap-6">
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

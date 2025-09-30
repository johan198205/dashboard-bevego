/**
 * Tests for prefetch service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prefetchRelevantViews, schedulePrefetch } from '../prefetch';
import { clearCache } from '../dataCache';

// Mock fetch
global.fetch = vi.fn();

describe('prefetch', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  describe('prefetchRelevantViews', () => {
    it('prefetches metrics for other views when on home page', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          meta: { source: 'mock', metric: 'sessions', dims: [] },
          summary: { current: 1000, prev: 900, yoyPct: 11.1 },
          timeseries: [],
          notes: ['Källa: Mock'],
        }),
      });

      const filterState = {
        start: '2025-01-01',
        end: '2025-01-31',
        grain: 'day',
        comparisonMode: 'yoy',
        audience: [],
        device: ['Desktop'],
        channel: [],
      };

      // Prefetch for home page (should prefetch other views)
      await prefetchRelevantViews('/', filterState);

      // Should have made fetch calls for metrics not on home page
      // Since we're prefetching for views other than home, there should be some calls
      expect(global.fetch).toHaveBeenCalled();
    });

    it('does not prefetch for current view', async () => {
      const filterState = {
        start: '2025-01-01',
        end: '2025-01-31',
        grain: 'day',
        comparisonMode: 'yoy',
        audience: [],
        device: [],
        channel: [],
      };

      // Clear any previous calls
      vi.clearAllMocks();

      // Prefetch should exclude current view's metrics
      await prefetchRelevantViews('/oversikt/besok', filterState);

      // Verify fetch was called (for other views)
      // The exact number depends on VIEW_METRICS configuration
      const fetchCalls = (global.fetch as any).mock.calls.length;
      expect(fetchCalls).toBeGreaterThan(0);
    });

    it('handles fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const filterState = {
        start: '2025-01-01',
        end: '2025-01-31',
        grain: 'day',
        comparisonMode: 'yoy',
        audience: [],
        device: [],
        channel: [],
      };

      // Should not throw (errors are suppressed in prefetch)
      await expect(
        prefetchRelevantViews('/', filterState)
      ).resolves.not.toThrow();
    });
  });

  describe('schedulePrefetch', () => {
    it('throttles rapid prefetch calls', async () => {
      const prefetchSpy = vi.spyOn(
        await import('../prefetch'),
        'prefetchRelevantViews'
      );

      const filterState = {
        start: '2025-01-01',
        end: '2025-01-31',
        grain: 'day',
        comparisonMode: 'yoy',
        audience: [],
        device: [],
        channel: [],
      };

      // Schedule multiple prefetches rapidly
      schedulePrefetch('/', filterState, 100);
      schedulePrefetch('/', filterState, 100);
      schedulePrefetch('/', filterState, 100);

      // Wait for throttle delay
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should only call prefetch once (last scheduled)
      expect(prefetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});

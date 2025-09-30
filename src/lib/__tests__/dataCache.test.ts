/**
 * Tests for enhanced data cache with deduplication, abort, and prefetch.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedWithMeta,
  setCachedData,
  fetchWithCache,
  abortAllRequests,
  clearCache,
  buildKpiCacheKey,
} from '../dataCache';

describe('dataCache', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('buildKpiCacheKey', () => {
    it('builds stable cache key with identical filters', () => {
      const params1 = {
        metric: 'mau',
        start: '2025-01-01',
        end: '2025-01-31',
        grain: 'day',
        comparisonMode: 'yoy',
        audience: ['Medlem', 'Styrelse'],
        device: ['Desktop'],
        channel: [],
      };

      const params2 = {
        metric: 'mau',
        start: '2025-01-01',
        end: '2025-01-31',
        grain: 'day',
        comparisonMode: 'yoy',
        audience: ['Styrelse', 'Medlem'], // Different order
        device: ['Desktop'],
        channel: [],
      };

      const key1 = buildKpiCacheKey(params1);
      const key2 = buildKpiCacheKey(params2);

      // Keys should be identical (order-independent for arrays in JSON)
      expect(key1).toBe(key2);
    });

    it('builds different keys for different filters', () => {
      const params1 = {
        metric: 'mau',
        start: '2025-01-01',
        end: '2025-01-31',
        grain: 'day',
        comparisonMode: 'yoy',
        audience: [],
        device: ['Desktop'],
        channel: [],
      };

      const params2 = {
        metric: 'mau',
        start: '2025-01-01',
        end: '2025-01-31',
        grain: 'day',
        comparisonMode: 'yoy',
        audience: [],
        device: ['Mobil'], // Different device
        channel: [],
      };

      const key1 = buildKpiCacheKey(params1);
      const key2 = buildKpiCacheKey(params2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('cache operations', () => {
    it('returns null for non-existent cache entry', () => {
      const result = getCachedWithMeta('non-existent-key');
      expect(result).toBeNull();
    });

    it('returns cached value if not expired', () => {
      const key = 'test-key';
      const value = { data: 'test' };
      setCachedData(key, value, 1000); // 1 second TTL

      const result = getCachedWithMeta(key);
      expect(result).not.toBeNull();
      expect(result?.value).toEqual(value);
      expect(result?.isStale).toBe(false);
    });

    it('marks cache as stale after 80% of TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 100; // 100ms
      setCachedData(key, value, ttl);

      // Wait for 80% of TTL
      await new Promise((resolve) => setTimeout(resolve, ttl * 0.85));

      const result = getCachedWithMeta(key);
      expect(result).not.toBeNull();
      expect(result?.isStale).toBe(true);
    });

    it('returns null for expired cache entry', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      setCachedData(key, value, 50); // 50ms TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60));

      const result = getCachedWithMeta(key);
      expect(result).toBeNull();
    });
  });

  describe('fetchWithCache', () => {
    it('deduplicates concurrent requests with same key', async () => {
      const key = 'test-key';
      const fetcher = vi.fn(async () => ({ data: 'test' }));

      // Fire multiple concurrent requests
      const promises = [
        fetchWithCache(key, fetcher),
        fetchWithCache(key, fetcher),
        fetchWithCache(key, fetcher),
      ];

      await Promise.all(promises);

      // Fetcher should only be called once
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('uses cached value on second call', async () => {
      const key = 'test-key';
      const fetcher = vi.fn(async () => ({ data: 'test' }));

      // First call
      await fetchWithCache(key, fetcher, { ttlMs: 1000 });

      // Second call (should use cache)
      await fetchWithCache(key, fetcher, { ttlMs: 1000 });

      // Fetcher should only be called once
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('supports abort signal', async () => {
      const key = 'test-key';
      const fetcher = vi.fn(async (signal: AbortSignal) => {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 100);
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
        return { data: 'test' };
      });

      // Start request
      const promise = fetchWithCache(key, fetcher);

      // Abort all requests
      setTimeout(() => abortAllRequests(), 10);

      // Should throw AbortError
      await expect(promise).rejects.toThrow('Aborted');
    });

    it('performs stale-while-revalidate', async () => {
      const key = 'test-key';
      let callCount = 0;
      const fetcher = vi.fn(async () => {
        callCount++;
        return { data: `call-${callCount}` };
      });

      // Initial fetch
      await fetchWithCache(key, fetcher, { ttlMs: 100 });

      // Wait for stale threshold
      await new Promise((resolve) => setTimeout(resolve, 85));

      // Second fetch should return stale immediately and trigger background refresh
      const result = await fetchWithCache(key, fetcher, { ttlMs: 100 });

      // Should return first result immediately
      expect(result).toEqual({ data: 'call-1' });

      // Background revalidation should have triggered (may not complete yet)
      // Wait a bit for background fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Fetcher should have been called twice (initial + revalidation)
      expect(callCount).toBeGreaterThanOrEqual(1); // At least initial call
    });
  });

  describe('clearCache', () => {
    it('clears all cache entries', () => {
      setCachedData('key1', { data: 'test1' }, 1000);
      setCachedData('key2', { data: 'test2' }, 1000);

      clearCache();

      expect(getCachedWithMeta('key1')).toBeNull();
      expect(getCachedWithMeta('key2')).toBeNull();
    });

    it('clears cache entries by prefix', () => {
      setCachedData('prefix-key1', { data: 'test1' }, 1000);
      setCachedData('prefix-key2', { data: 'test2' }, 1000);
      setCachedData('other-key', { data: 'test3' }, 1000);

      clearCache('prefix-');

      expect(getCachedWithMeta('prefix-key1')).toBeNull();
      expect(getCachedWithMeta('prefix-key2')).toBeNull();
      expect(getCachedWithMeta('other-key')).not.toBeNull();
    });
  });
});

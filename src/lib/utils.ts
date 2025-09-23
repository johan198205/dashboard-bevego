import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple in-memory cache with TTL for fetch responses
type CacheEntry<T> = { value: T; expiresAt: number }
const memoryCache = new Map<string, CacheEntry<any>>()

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }
  return entry.value as T
}

export function setCached<T>(key: string, value: T, ttlMs: number) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function makeCacheKey(parts: Record<string, unknown>): string {
  // Stable stringify
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}:${JSON.stringify((parts as any)[k])}`)
    .join("|")
}

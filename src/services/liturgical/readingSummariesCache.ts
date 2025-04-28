// readingSummariesCache.ts
// Robust, production-ready client-side cache for reading summaries (and similar data)
// Uses localStorage for persistence, with in-memory fallback

import type { LiturgicalReading } from '@/types/liturgical';

const CACHE_KEY = 'paro_reading_summaries_v1';
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SummaryCacheEntry {
  summary: string;
  detailedExplanation?: string;
  timestamp: number;
}

type SummaryCache = {
  [key: string]: SummaryCacheEntry;
};

// In-memory fallback cache
let memoryCache: SummaryCache | null = null;

function loadCache(): SummaryCache {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: SummaryCache = JSON.parse(raw);
      // Filter out expired entries
      const now = Date.now();
      for (const key of Object.keys(parsed)) {
        if (now - parsed[key].timestamp > CACHE_EXPIRATION_MS) {
          delete parsed[key];
        }
      }
      memoryCache = parsed;
      return parsed;
    }
  } catch (err) {
    // localStorage might be unavailable or corrupted
    console.warn('Failed to load reading summaries cache:', err);
  }
  memoryCache = {};
  return memoryCache;
}

function saveCache(cache: SummaryCache) {
  memoryCache = cache;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    // localStorage may be full or unavailable
    console.warn('Failed to save reading summaries cache:', err);
  }
}

function makeCacheKey(title: string, citation: string): string {
  return `${title.trim().toLowerCase()}::${citation.trim().toLowerCase()}`;
}

export function getSummaryWithCache(
  title: string,
  citation: string
): SummaryCacheEntry | null {
  const cache = loadCache();
  const key = makeCacheKey(title, citation);
  const entry = cache[key];
  if (!entry) return null;
  // Expiry check (redundant with loadCache, but safe)
  if (Date.now() - entry.timestamp > CACHE_EXPIRATION_MS) {
    delete cache[key];
    saveCache(cache);
    return null;
  }
  return entry;
}

export function saveSummaryToCache(
  title: string,
  citation: string,
  summary: string,
  detailedExplanation?: string
) {
  const cache = loadCache();
  const key = makeCacheKey(title, citation);
  cache[key] = {
    summary,
    detailedExplanation,
    timestamp: Date.now(),
  };
  saveCache(cache);
}

export function clearOldSummariesFromCache() {
  const cache = loadCache();
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(cache)) {
    if (now - cache[key].timestamp > CACHE_EXPIRATION_MS) {
      delete cache[key];
      changed = true;
    }
  }
  if (changed) saveCache(cache);
}

export function clearAllSummariesFromCache() {
  memoryCache = {};
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    // Ignore
  }
}

// Returns basic statistics about the cache: count, size, and oldest/newest entry timestamps
export function getCacheStats() {
  const cache = loadCache();
  const keys = Object.keys(cache);
  let totalSize = 0;
  let oldest = null;
  let newest = null;
  for (const key of keys) {
    const entry = cache[key];
    const entrySize =
      key.length +
      (entry.summary?.length || 0) +
      (entry.detailedExplanation?.length || 0) +
      8; // timestamp approx
    totalSize += entrySize;
    if (!oldest || entry.timestamp < oldest) oldest = entry.timestamp;
    if (!newest || entry.timestamp > newest) newest = entry.timestamp;
  }
  return {
    count: keys.length,
    totalSizeBytes: totalSize,
    oldestTimestamp: oldest,
    newestTimestamp: newest,
  };
}

// Pre-fetch all readings and summaries for a given date and cache them
export async function preFetchReadingsForDate(
  date: Date,
  getDailyMassReadings: (date: Date) => Promise<LiturgicalReading[]>,
  getReadingSummary: (reading: { title: string; citation: string }) => Promise<{ summary: string; detailedExplanation?: string }>
): Promise<number> {
  const readings = await getDailyMassReadings(date);
  let count = 0;
  for (const reading of readings) {
    const cached = getSummaryWithCache(reading.title, reading.citation);
    if (!cached) {
      try {
        const summaryObj = await getReadingSummary({ title: reading.title, citation: reading.citation });
        saveSummaryToCache(reading.title, reading.citation, summaryObj.summary, summaryObj.detailedExplanation);
        count++;
      } catch (e) {
        // Ignore individual reading summary errors
      }
    }
  }
  return count;
}

// Clear the cache and return the number of entries deleted
export function clearCache() {
  const cache = loadCache();
  const count = Object.keys(cache).length;
  clearAllSummariesFromCache();
  return count;
}

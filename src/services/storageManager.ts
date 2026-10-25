/**
 * Storage Manager (Phase 7)
 * Centralizes localStorage access, schema versioning (v7), LRU cache eviction,
 * and quota protection against QuotaExceededError.
 */

export const SCHEMA_VERSION = 7;
export const SCHEMA_VERSION_KEY = 'studyquest_schema_version';

export interface StorageStats {
  usedKb: number;
  cacheKb: number;
  totalKeys: number;
}

/**
 * Calculates current localStorage usage in Kilobytes.
 */
export function getStorageUsageKB(): StorageStats {
  try {
    let totalChars = 0;
    let cacheChars = 0;
    let count = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      count++;
      const val = localStorage.getItem(key) || '';
      const size = key.length + val.length;
      totalChars += size;

      if (
        key.startsWith('studyquest_questions_') ||
        key.startsWith('studyquest_liehunter_') ||
        key.startsWith('studyquest_platformer_') ||
        key.startsWith('studyquest_content_') ||
        key.startsWith('studyquest_game_choice_')
      ) {
        cacheChars += size;
      }
    }

    // 2 bytes per UTF-16 character in memory
    const usedKb = Math.round((totalChars * 2) / 1024);
    const cacheKb = Math.round((cacheChars * 2) / 1024);

    return { usedKb, cacheKb, totalKeys: count };
  } catch {
    return { usedKb: 0, cacheKb: 0, totalKeys: 0 };
  }
}

/**
 * Removes cached level questions, lie hunter cases, and platformer layouts
 * to free up memory without resetting learner progress.
 * Returns the number of KB freed.
 */
export function clearAllQuestionCaches(): number {
  try {
    const beforeKb = getStorageUsageKB().usedKb;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('studyquest_questions_') ||
          key.startsWith('studyquest_liehunter_') ||
          key.startsWith('studyquest_platformer_') ||
          key.startsWith('studyquest_content_') ||
          key.startsWith('studyquest_game_choice_'))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
    const afterKb = getStorageUsageKB().usedKb;
    return Math.max(0, beforeKb - afterKb);
  } catch (err) {
    console.warn('Error clearing question caches:', err);
    return 0;
  }
}

/**
 * Safely saves a key-value pair to localStorage with automatic LRU eviction on quota errors.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    // If quota exceeded, evict dynamic caches and retry
    if (
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.number === -2147024882
    ) {
      console.warn('LocalStorage quota reached, performing LRU cache eviction...');
      clearAllQuestionCaches();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.error('Failed to save to localStorage after cache eviction:', retryErr);
        return false;
      }
    }
    console.error('Error saving to localStorage:', err);
    return false;
  }
}

/**
 * Migrates older schema versions up to Version 7.
 */
export function runStorageMigrations(): void {
  try {
    const rawVersion = localStorage.getItem(SCHEMA_VERSION_KEY);
    const currentVer = rawVersion ? parseInt(rawVersion, 10) : 1;

    if (currentVer < SCHEMA_VERSION) {
      // Migrate progress structure to guarantee fields exist
      const rawProgress = localStorage.getItem('studyquest_progress');
      if (rawProgress) {
        try {
          const parsed = JSON.parse(rawProgress);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.concepts) parsed.concepts = {};
            if (!parsed.levels) parsed.levels = {};
            if (typeof parsed.totalXp !== 'number') parsed.totalXp = 0;

            // Ensure concepts conform to Phase 6 & 7 fields
            Object.values(parsed.concepts).forEach((c: any) => {
              if (c && typeof c === 'object') {
                if (!Array.isArray(c.recent)) c.recent = [];
                if (typeof c.reviewStreak !== 'number') c.reviewStreak = 0;
                if (typeof c.revisions !== 'number') c.revisions = 0;
              }
            });

            localStorage.setItem('studyquest_progress', JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Could not parse progress during v7 migration:', e);
        }
      }

      localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
    }
  } catch (err) {
    console.warn('Failed to run storage migrations:', err);
  }
}

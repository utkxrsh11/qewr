/**
 * Unified AI Client Wrapper (Phase 7)
 * Enforces concurrency limits (max 3), exponential backoff retry (1s, 3s),
 * 90s request timeouts, and offline-safe detection.
 * Never exposes API keys in client-side code.
 */

const MAX_CONCURRENT_REQUESTS = 3;
let activeRequestsCount = 0;
const requestQueue: Array<() => void> = [];

function dequeueNext() {
  if (activeRequestsCount < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) {
      activeRequestsCount++;
      next();
    }
  }
}

function acquireLock(): Promise<void> {
  return new Promise((resolve) => {
    if (activeRequestsCount < MAX_CONCURRENT_REQUESTS) {
      activeRequestsCount++;
      resolve();
    } else {
      requestQueue.push(resolve);
    }
  });
}

function releaseLock(): void {
  activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  dequeueNext();
}

/**
 * Checks whether the app is running in offline mode.
 * Evaluates navigator.onLine and URL parameters (?offline=1).
 */
export function isOfflineMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (!navigator.onLine) return true;
  const search = new URLSearchParams(window.location.search);
  if (search.get('offline') === '1') return true;
  return localStorage.getItem('studyquest_offline_mode') === 'true';
}

/**
 * Safe fetch with concurrency limit, exponential backoff, and offline awareness.
 */
export async function safeAiFetch(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  timeoutMs = 90000
): Promise<Response> {
  if (isOfflineMode()) {
    throw new Error('OFFLINE_MODE: Device is offline or demo offline mode is enabled.');
  }

  await acquireLock();

  try {
    let attempt = 0;
    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Chain caller's abort signal if provided
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If rate limited or server error, retry with exponential backoff
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          attempt++;
          const delay = attempt === 1 ? 1000 : 3000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (options.signal?.aborted) {
          throw err;
        }

        if (attempt < maxRetries) {
          attempt++;
          const delay = attempt === 1 ? 1000 : 3000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw err;
      }
    }

    throw new Error('Exceeded maximum retry attempts for AI service request.');
  } finally {
    releaseLock();
  }
}

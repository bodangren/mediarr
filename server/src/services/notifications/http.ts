export type FetchFn = typeof fetch;

const DEFAULT_TIMEOUT_MS = 10_000;

export interface TransportHttpOptions {
  fetchFn?: FetchFn;
  timeoutMs?: number;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  options: TransportHttpOptions,
  timeoutMessage: string,
): Promise<Response> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetchFn(url, init), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

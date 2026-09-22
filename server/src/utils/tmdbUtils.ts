export interface TMDBRequest {
  url: string;
  headers: Record<string, string>;
}

const READ_ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function isTMDBReadAccessToken(apiKey: string): boolean {
  return READ_ACCESS_TOKEN_PATTERN.test(apiKey.trim());
}

export function buildTMDBRequest(
  baseUrl: string,
  path: string,
  apiKey: string,
  params: string[] = [],
): TMDBRequest {
  if (isTMDBReadAccessToken(apiKey)) {
    const query = params.join('&');
    return {
      url: query ? `${baseUrl}${path}?${query}` : `${baseUrl}${path}`,
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    };
  }

  const query = [`api_key=${encodeURIComponent(apiKey)}`, ...params].join('&');
  return {
    url: `${baseUrl}${path}?${query}`,
    headers: {},
  };
}

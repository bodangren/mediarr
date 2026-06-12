import { createHandlers } from './handlers';

// Caching the deterministic handlers avoids rebuilding the 100+ handler array and
// mock dataset on every helper call. The dataset is deterministic and the tests do
// not rely on a fresh per-call state, so a shared instance is safe and dramatically
// faster for the contract-coverage suites.
const cachedHandlers = createHandlers('deterministic');

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteExpectation {
  method: Method;
  url: string;
  /** When true, also assert the handler produces a non-error response body. */
  expectEnvelope?: boolean;
}

interface HandlerInfo {
  method: string;
  path: string;
}

interface FoundHandler {
  handler: { test: (args: { request: Request }) => Promise<boolean> };
  path: string;
}

function createRequest(method: Method, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function getResolutionContext(url: string): { baseUrl: string } {
  return { baseUrl: new URL(url).origin };
}

/**
 * Returns true when `handlerPath` is the most specific pattern that subsumes `requestPath`.
 * Allows `:param` placeholders to match literal segments (lenient). This is the right
 * choice for routes that do not have literal/parameterized collisions.
 */
export function isSpecificMatch(handlerPath: string, requestPath: string): boolean {
  if (handlerPath === requestPath) return true;
  const handlerSegments = handlerPath.split('/');
  const requestSegments = requestPath.split('/');
  if (handlerSegments.length !== requestSegments.length) return false;
  for (let i = 0; i < handlerSegments.length; i++) {
    const h = handlerSegments[i];
    const r = requestSegments[i];
    if (h === r) continue;
    if (h?.startsWith(':')) continue;
    return false;
  }
  return true;
}

/**
 * Returns true only when `handlerPath` is at least as specific as `requestPath`.
 * Rejects handlers that use `:param` placeholders where `requestPath` has a literal
 * segment. This is the right choice for routes that add literal dedicated handlers
 * alongside catch-all `:id` handlers.
 */
export function isMostSpecificMatch(handlerPath: string, requestPath: string): boolean {
  if (handlerPath === requestPath) return true;
  const handlerSegments = handlerPath.split('/');
  const requestSegments = requestPath.split('/');
  if (handlerSegments.length !== requestSegments.length) return false;
  for (let i = 0; i < handlerSegments.length; i++) {
    const h = handlerSegments[i];
    const r = requestSegments[i];
    if (h === r) continue;
    if (h?.startsWith(':')) {
      return false;
    }
    return false;
  }
  return true;
}

export async function findHandler(
  method: Method,
  url: string,
  matcher: (handlerPath: string, requestPath: string) => boolean = isSpecificMatch,
): Promise<FoundHandler | undefined> {
  const request = new Request(url, { method });
  // MSW stores handler paths as relative strings (e.g. "/api/movies"). To match them
  // against a full Request URL we must pass a baseUrl in the resolutionContext; without
  // it, matchRequestUrl treats the relative path as a full URL and never matches.
  const resolutionContext = getResolutionContext(url);
  const requestPath = new URL(url).pathname;

  for (const handler of cachedHandlers) {
    const info = handler.info as HandlerInfo;
    if (info.method !== method) continue;
    const matches = await handler.test({ request, resolutionContext });
    if (!matches) continue;
    if (!matcher(info.path, requestPath)) continue;
    return {
      handler: handler as unknown as { test: (args: { request: Request }) => Promise<boolean> },
      path: info.path,
    };
  }
  return undefined;
}

export async function runHandler(
  method: Method,
  url: string,
  body?: unknown,
  matcher: (handlerPath: string, requestPath: string) => boolean = isSpecificMatch,
): Promise<Response> {
  const request = createRequest(method, url, body);
  const resolutionContext = getResolutionContext(url);
  const requestPath = new URL(url).pathname;

  for (const handler of cachedHandlers) {
    const info = handler.info as HandlerInfo;
    if (info.method !== method) continue;
    const matches = await handler.test({ request, resolutionContext });
    if (!matches) continue;
    if (!matcher(info.path, requestPath)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as any).run({ request, requestId: `red-${method}-${url}`, resolutionContext });
    if (result?.response) {
      return result.response as Response;
    }
  }
  throw new Error(`No matching handler for ${method} ${url}`);
}

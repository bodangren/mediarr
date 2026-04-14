import * as os from 'node:os';

export interface DiscoveredService {
  type: 'prowlarr' | 'jackett';
  url: string;
  host: string;
  port: number;
  name?: string;
  version?: string;
  indexerCount?: number;
}

export interface IndexerServiceDiscoveryOptions {
  probeTimeoutMs?: number;
  ports?: { prowlarr: number; jackett: number };
  fetchFn?: typeof fetch;
}

const DEFAULT_PORTS = {
  prowlarr: 9696,
  jackett: 9117,
};

const PROWLARR_STATUS_PATH = '/api/v1/system/status';
const JACKETT_INDEXERS_PATH = '/api/v2.0/indexers';

function getLanSubnet(): string[] {
  const ifaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const iface of Object.values(ifaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('192.168')) {
        const parts = addr.address.split('.');
        parts.pop();
        candidates.push(parts.join('.'));
      }
    }
  }

  return candidates.length > 0 ? candidates : ['192.168.1'];
}

function generateCandidateHosts(subnet: string): string[] {
  const hosts: string[] = [];
  for (let i = 1; i <= 254; i++) {
    hosts.push(`${subnet}.${i}`);
  }
  return hosts;
}

async function probeHost(
  host: string,
  port: number,
  path: string,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<string | null> {
  const url = `http://${host}:${port}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      return url;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function detectProwlarr(
  host: string,
  port: number,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<DiscoveredService | null> {
  const url = await probeHost(host, port, PROWLARR_STATUS_PATH, timeoutMs, fetchFn);
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetchFn(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json() as { name?: string; version?: string };
    return {
      type: 'prowlarr',
      url: `http://${host}:${port}`,
      host,
      port,
      name: data.name,
      version: data.version,
    };
  } catch {
    return {
      type: 'prowlarr',
      url: `http://${host}:${port}`,
      host,
      port,
    };
  }
}

async function detectJackett(
  host: string,
  port: number,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<DiscoveredService | null> {
  const url = await probeHost(host, port, JACKETT_INDEXERS_PATH, timeoutMs, fetchFn);
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetchFn(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json() as { indexers?: Array<{ name: string }> };
    return {
      type: 'jackett',
      url: `http://${host}:${port}`,
      host,
      port,
      indexerCount: data.indexers?.length,
    };
  } catch {
    return {
      type: 'jackett',
      url: `http://${host}:${port}`,
      host,
      port,
    };
  }
}

export class IndexerServiceDiscovery {
  private readonly probeTimeoutMs: number;
  private readonly ports: { prowlarr: number; jackett: number };
  private readonly fetchFn: typeof fetch;

  constructor(options: IndexerServiceDiscoveryOptions = {}) {
    this.probeTimeoutMs = options.probeTimeoutMs ?? 2000;
    this.ports = options.ports ?? DEFAULT_PORTS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async detect(): Promise<DiscoveredService[]> {
    const results: DiscoveredService[] = [];
    const subnets = getLanSubnet();

    const prowlarrPromises: Promise<DiscoveredService | null>[] = [];
    const jackettPromises: Promise<DiscoveredService | null>[] = [];

    for (const subnet of subnets) {
      const hosts = generateCandidateHosts(subnet);

      for (const host of hosts) {
        prowlarrPromises.push(
          detectProwlarr(host, this.ports.prowlarr, this.probeTimeoutMs, this.fetchFn),
        );
        jackettPromises.push(
          detectJackett(host, this.ports.jackett, this.probeTimeoutMs, this.fetchFn),
        );
      }
    }

    const [prowlarrResults, jackettResults] = await Promise.all([
      Promise.all(prowlarrPromises),
      Promise.all(jackettPromises),
    ]);

    for (const result of prowlarrResults) {
      if (result) results.push(result);
    }
    for (const result of jackettResults) {
      if (result) results.push(result);
    }

    return results;
  }
}
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { IndexerServiceDiscovery, type DiscoveredService } from './IndexerServiceDiscovery';

describe('IndexerServiceDiscovery', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('detect', () => {
    it('returns empty array when no services are detected', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.resolve({ ok: false });
      });

      const discovery = new IndexerServiceDiscovery({
        probeTimeoutMs: 100,
        fetchFn: mockFetch,
      });

      const results = await discovery.detect();
      expect(results).toEqual([]);
    });

    it('detects Prowlarr service when it responds', async () => {
      const prowlarrResponses = new Map<string, unknown>();

      mockFetch.mockImplementation((url: string) => {
        if (url.includes(':9696')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ name: 'Prowlarr', version: '1.0.0' }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const discovery = new IndexerServiceDiscovery({
        probeTimeoutMs: 100,
        fetchFn: mockFetch,
      });

      const results = await discovery.detect();

      expect(results.some(r => r.type === 'prowlarr')).toBe(true);
      const prowlarr = results.find(r => r.type === 'prowlarr') as DiscoveredService;
      expect(prowlarr.port).toBe(9696);
      expect(prowlarr.name).toBe('Prowlarr');
      expect(prowlarr.version).toBe('1.0.0');
    });

    it('detects Jackett service when it responds', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes(':9117')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ indexers: [{ name: 'Tracker1' }, { name: 'Tracker2' }] }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const discovery = new IndexerServiceDiscovery({
        probeTimeoutMs: 100,
        fetchFn: mockFetch,
      });

      const results = await discovery.detect();

      expect(results.some(r => r.type === 'jackett')).toBe(true);
      const jackett = results.find(r => r.type === 'jackett') as DiscoveredService;
      expect(jackett.port).toBe(9117);
      expect(jackett.indexerCount).toBe(2);
    });

    it('detects both Prowlarr and Jackett on different hosts', async () => {
      const detectedUrls: string[] = [];
      mockFetch.mockImplementation((url: string) => {
        detectedUrls.push(url);
        if (url.includes(':9696')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ name: 'Prowlarr', version: '1.0.0' }),
          });
        }
        if (url.includes(':9117')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ indexers: [{ name: 'Tracker1' }] }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const discovery = new IndexerServiceDiscovery({
        probeTimeoutMs: 50,
        fetchFn: mockFetch,
      });

      const results = await discovery.detect();

      const prowlarrResults = results.filter(r => r.type === 'prowlarr');
      const jackettResults = results.filter(r => r.type === 'jackett');
      expect(prowlarrResults.length).toBeGreaterThan(0);
      expect(jackettResults.length).toBeGreaterThan(0);
      expect(prowlarrResults[0]?.port).toBe(9696);
      expect(jackettResults[0]?.port).toBe(9117);
    });

    it('returns partial data when Prowlarr responds but JSON parse fails', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes(':9696')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.reject(new Error('invalid json')),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const discovery = new IndexerServiceDiscovery({
        probeTimeoutMs: 100,
        fetchFn: mockFetch,
      });

      const results = await discovery.detect();

      expect(results.some(r => r.type === 'prowlarr')).toBe(true);
      const prowlarr = results.find(r => r.type === 'prowlarr') as DiscoveredService;
      expect(prowlarr.name).toBeUndefined();
      expect(prowlarr.version).toBeUndefined();
    });

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('network error'));
      });

      const discovery = new IndexerServiceDiscovery({
        probeTimeoutMs: 100,
        fetchFn: mockFetch,
      });

      const results = await discovery.detect();
      expect(results).toEqual([]);
    });

    it('uses custom ports when specified', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes(':9876')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ name: 'CustomProwlarr', version: '2.0.0' }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const discovery = new IndexerServiceDiscovery({
        probeTimeoutMs: 100,
        ports: { prowlarr: 9876, jackett: 9118 },
        fetchFn: mockFetch,
      });

      const results = await discovery.detect();

      expect(results.some(r => r.type === 'prowlarr' && r.port === 9876)).toBe(true);
    });
  });
});
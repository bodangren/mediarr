import { describe, expect, it } from 'vitest';
import { IndexerFactory } from '../IndexerFactory';
import { HttpClient } from '../HttpClient';
import { ScrapingIndexer, TorznabIndexer } from '../BaseIndexer';

describe('Cardigann compatibility validation', () => {
  it('rejects Cardigann records missing definitionId with actionable diagnostics', () => {
    const factory = new IndexerFactory([
      {
        id: 'valid',
        name: 'Valid Def',
        type: 'public',
        links: ['https://example.test'],
        search: {
          paths: [{ path: '/search' }],
          rows: { selector: 'tr' },
          fields: { title: { selector: '.title' } },
        },
      },
    ], new HttpClient());

    expect(() => factory.fromDatabaseRecord({
      id: 1,
      name: 'Cardigann Missing Definition',
      implementation: 'Cardigann',
      configContract: 'CardigannSettings',
      settings: JSON.stringify({}),
      protocol: 'torrent',
      supportedMediaTypes: '[]',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      added: new Date(),
    } as never)).toThrow(/definitionid/i);
  });

  it('rejects incompatible definitions and includes remediation details', () => {
    const factory = new IndexerFactory([
      {
        id: 'bad-response',
        name: 'Bad Response',
        type: 'public',
        links: ['https://example.test'],
        search: {
          paths: [{ path: '/search', response: { type: 'xml' } }],
          rows: { selector: 'tr' },
          fields: { title: { selector: '.title' } },
        },
      },
    ], new HttpClient());

    expect(() => factory.fromDatabaseRecord({
      id: 1,
      name: 'Bad Definition Indexer',
      implementation: 'Cardigann',
      configContract: 'CardigannSettings',
      settings: JSON.stringify({ definitionId: 'bad-response' }),
      protocol: 'torrent',
      supportedMediaTypes: '[]',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      added: new Date(),
    } as never)).toThrow(/incompatible|response type|remediation/i);
  });

  it('allows degraded definitions while exposing soft compatibility issues', () => {
    const factory = new IndexerFactory([
      {
        id: 'degraded',
        name: 'Degraded Def',
        type: 'public',
        links: ['https://example.test'],
        search: {
          paths: [{ path: '{{ if ne .Keywords "" }}search{{ else }}browse{{ end }}' }],
          rows: { selector: 'tr' },
          fields: { title: { selector: '.title' } },
        },
      },
    ], new HttpClient());

    const indexer = factory.fromDefinition('degraded', { definitionId: 'degraded' });
    expect(indexer.compatibility?.status).toBe('degraded');
    expect(indexer.compatibility?.issues.some(issue => issue.severity === 'soft')).toBe(true);
  });

  it('creates Cardigann and Torznab indexers for compatible records', () => {
    const factory = new IndexerFactory([
      {
        id: 'ok-cardigann',
        name: 'OK Cardigann',
        type: 'public',
        links: ['https://example.test'],
        search: {
          paths: [{ path: '/search' }],
          rows: { selector: 'tr' },
          fields: { title: { selector: '.title' } },
        },
      },
    ], new HttpClient());

    const cardigann = factory.fromDatabaseRecord({
      id: 5,
      name: 'Cardigann',
      implementation: 'Cardigann',
      configContract: 'CardigannSettings',
      settings: JSON.stringify({ definitionId: 'ok-cardigann' }),
      protocol: 'torrent',
      supportedMediaTypes: '[]',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      added: new Date(),
    } as never);
    expect(cardigann).toBeInstanceOf(ScrapingIndexer);
    expect((cardigann as ScrapingIndexer).compatibility?.status).toBe('compatible');

    const torznab = factory.fromDatabaseRecord({
      id: 6,
      name: 'Torznab',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      settings: JSON.stringify({ url: 'https://torznab.example', apiKey: 'key' }),
      protocol: 'torrent',
      supportedMediaTypes: '[]',
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
      added: new Date(),
    } as never);
    expect(torznab).toBeInstanceOf(TorznabIndexer);
  });

  it('surfaces diagnostics for unknown definitions and unsupported implementations', () => {
    const factory = new IndexerFactory([], new HttpClient());

    expect(() => factory.getCompatibilityReport('missing')).toThrow(/definition not found/i);

    expect(() => factory.fromDatabaseRecord({
      id: 7,
      name: 'Unknown Impl',
      implementation: 'UnknownImpl',
      configContract: 'UnknownSettings',
      settings: JSON.stringify({}),
      protocol: 'torrent',
      supportedMediaTypes: '[]',
      enabled: true,
      supportsRss: false,
      supportsSearch: false,
      priority: 25,
      added: new Date(),
    } as never)).toThrow(/unsupported indexer implementation/i);
  });
});

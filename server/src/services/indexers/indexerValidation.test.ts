import { describe, expect, it } from 'vitest';
import { validateCatalogEntry } from './indexerValidation';
import type { CatalogEntry } from './CatalogCache';

const mockEntry = (overrides: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id: 'test-indexer',
  name: 'Test Indexer',
  description: 'A test indexer',
  type: 'torznab',
  baseUrl: 'https://example.com',
  categories: ['TV', 'MOVIE'],
  requiresApiKey: false,
  signupUrl: 'https://example.com/signup',
  implementation: 'Torznab',
  configContract: 'TorznabSettings',
  supportedMediaTypes: ['TV', 'MOVIE'],
  supportsSearch: true,
  supportsRss: true,
  ...overrides,
});

describe('validateCatalogEntry', () => {
  it('passes when API key is not required', () => {
    const entry = mockEntry({ requiresApiKey: false });
    const result = validateCatalogEntry(entry);

    expect(result.valid).toBe(true);
    expect(result.requiresApiKey).toBe(false);
    expect(result.message).toBeUndefined();
  });

  it('passes when API key is required and provided', () => {
    const entry = mockEntry({ requiresApiKey: true });
    const result = validateCatalogEntry(entry, 'my-secret-key');

    expect(result.valid).toBe(true);
    expect(result.requiresApiKey).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('rejects when API key is required but not provided', () => {
    const entry = mockEntry({ requiresApiKey: true, name: 'NZBGeek' });
    const result = validateCatalogEntry(entry);

    expect(result.valid).toBe(false);
    expect(result.requiresApiKey).toBe(true);
    expect(result.message).toBe('Indexer "NZBGeek" requires an API key. Please provide one.');
  });

  it('rejects when API key is required but empty string', () => {
    const entry = mockEntry({ requiresApiKey: true });
    const result = validateCatalogEntry(entry, '');

    expect(result.valid).toBe(false);
    expect(result.requiresApiKey).toBe(true);
  });

  it('rejects when API key is required but whitespace only', () => {
    const entry = mockEntry({ requiresApiKey: true });
    const result = validateCatalogEntry(entry, '   ');

    expect(result.valid).toBe(false);
    expect(result.requiresApiKey).toBe(true);
  });

  it('passes when API key is not required even if provided', () => {
    const entry = mockEntry({ requiresApiKey: false });
    const result = validateCatalogEntry(entry, 'some-key');

    expect(result.valid).toBe(true);
    expect(result.requiresApiKey).toBe(false);
  });
});

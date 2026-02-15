import { describe, expect, it } from 'vitest';
import { indexerPresets, getPresetById, getPresetsByProtocol, getPopularPresets } from './indexerPresets';
import type { IndexerPreset } from '@/app/(shell)/indexers/AddIndexerModal';

describe('indexerPresets', () => {
  it('exports an array of IndexerPreset objects', () => {
    expect(Array.isArray(indexerPresets)).toBe(true);
    expect(indexerPresets.length).toBeGreaterThan(0);
  });

  it('contains only torrent indexers (no usenet)', () => {
    const usenetPresets = indexerPresets.filter(preset => preset.protocol === 'usenet');
    expect(usenetPresets.length).toBe(0);
  });

  it('each preset has required fields', () => {
    indexerPresets.forEach(preset => {
      expect(preset).toHaveProperty('id');
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('description');
      expect(preset).toHaveProperty('protocol');
      expect(preset).toHaveProperty('implementation');
      expect(preset).toHaveProperty('configContract');
      expect(preset).toHaveProperty('fields');
      expect(typeof preset.id).toBe('string');
      expect(typeof preset.name).toBe('string');
      expect(typeof preset.description).toBe('string');
      expect(preset.protocol).toBe('torrent');
      expect(Array.isArray(preset.fields)).toBe(true);
    });
  });

  it('each preset has unique id', () => {
    const ids = indexerPresets.map(preset => preset.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('contains at least 20 popular indexer presets', () => {
    expect(indexerPresets.length).toBeGreaterThanOrEqual(20);
  });

  it('contains expected popular indexers', () => {
    const popularIds = [
      'alpharatio',
      'anidex',
      'animebytes',
      'beyondhd',
      'gazellegames',
      'greatposterwall',
      'hdspace',
      'hdtorrents',
      'iptorrents',
      'myanonamouse',
      'nebulance',
      'redacted',
      'scenehd',
      'subsplease',
      'torrentday',
      'torrentscsv',
      'torrentsyndikat',
      'xspeeds',
      'bakabt',
      'funfile',
    ];

    const presetIds = indexerPresets.map(preset => preset.id);
    popularIds.forEach(id => {
      expect(presetIds).toContain(id);
    });
  });

  it('each field in presets has valid structure', () => {
    indexerPresets.forEach(preset => {
      preset.fields.forEach(field => {
        expect(field).toHaveProperty('name');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
        expect(typeof field.name).toBe('string');
        expect(typeof field.label).toBe('string');
        expect(['text', 'password', 'number', 'boolean']).toContain(field.type);
        expect(field.required === undefined || typeof field.required === 'boolean').toBe(true);
      });
    });
  });

  it('baseUrl field is present and required for all indexers', () => {
    indexerPresets.forEach(preset => {
      const baseUrlField = preset.fields.find(f => f.name === 'baseUrl');
      expect(baseUrlField).toBeDefined();
      expect(baseUrlField?.required).toBe(true);
      expect(baseUrlField?.type).toBe('text');
    });
  });

  it('private indexers have auth fields (cookie, username/password, or apikey)', () => {
    // Public trackers that don't require auth
    const publicTrackerIds = ['anidex', 'torrentscsv', 'knaben', 'subsplease', 'animedia'];

    indexerPresets.forEach(preset => {
      if (publicTrackerIds.includes(preset.id)) {
        // Public trackers don't require auth
        const hasCookie = preset.fields.some(f => f.name === 'cookie');
        const hasUsername = preset.fields.some(f => f.name === 'username');
        const hasApikey = preset.fields.some(f => f.name === 'apikey');
        expect(hasCookie || hasUsername || hasApikey).toBe(false);
      } else {
        // Private trackers require auth
        const hasCookie = preset.fields.some(f => f.name === 'cookie');
        const hasUsername = preset.fields.some(f => f.name === 'username');
        const hasApikey = preset.fields.some(f => f.name === 'apikey');
        expect(hasCookie || hasUsername || hasApikey).toBe(true);
      }
    });
  });

  it('preset descriptions are not empty', () => {
    indexerPresets.forEach(preset => {
      expect(preset.description.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('getPresetById', () => {
  it('returns correct preset for valid id', () => {
    const preset = getPresetById('iptorrents');
    expect(preset).toBeDefined();
    expect(preset?.id).toBe('iptorrents');
    expect(preset?.name).toBe('IPTorrents');
  });

  it('returns undefined for invalid id', () => {
    const preset = getPresetById('nonexistent');
    expect(preset).toBeUndefined();
  });

  it('is case-sensitive', () => {
    const preset = getPresetById('IPTORRENTS');
    expect(preset).toBeUndefined();
  });
});

describe('getPresetsByProtocol', () => {
  it('returns all presets for torrent protocol', () => {
    const torrentPresets = getPresetsByProtocol('torrent');
    expect(torrentPresets.length).toBe(indexerPresets.length);
    expect(torrentPresets.every(p => p.protocol === 'torrent')).toBe(true);
  });

  it('returns empty array for usenet protocol', () => {
    const usenetPresets = getPresetsByProtocol('usenet');
    expect(usenetPresets).toEqual([]);
  });
});

describe('getPopularPresets', () => {
  it('returns subset of all presets', () => {
    const popularPresets = getPopularPresets();
    expect(popularPresets.length).toBeGreaterThan(0);
    expect(popularPresets.length).toBeLessThanOrEqual(indexerPresets.length);
  });

  it('returns most commonly used indexers', () => {
    const popularPresets = getPopularPresets();
    const popularIds = popularPresets.map(p => p.id);

    // Should include popular general trackers
    expect(popularIds).toContain('iptorrents');
    expect(popularIds).toContain('torrentday');

    // Should include popular content-specific trackers
    expect(popularIds).toContain('redacted');
    expect(popularIds).toContain('animebytes');
    expect(popularIds).toContain('beyondhd');
  });

  it('has no duplicates', () => {
    const popularPresets = getPopularPresets();
    const ids = popularPresets.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('preset field validation', () => {
  it('Gazelle-based indexers have apikey field', () => {
    const gazellePresets = ['alpharatio', 'redacted', 'myanonamouse', 'greatposterwall'];
    gazellePresets.forEach(id => {
      const preset = getPresetById(id);
      expect(preset).toBeDefined();
      const hasApikey = preset?.fields.some(f => f.name === 'apikey');
      expect(hasApikey).toBe(true);
    });
  });

  it('Cookie-based indexers have cookie field', () => {
    const cookiePresets = ['iptorrents', 'torrentday', 'nebulance', 'scenehd'];
    cookiePresets.forEach(id => {
      const preset = getPresetById(id);
      expect(preset).toBeDefined();
      const hasCookie = preset?.fields.some(f => f.name === 'cookie');
      expect(hasCookie).toBe(true);
    });
  });

  it('No-auth indexers have only baseUrl field', () => {
    const noAuthPresets = ['anidex', 'torrentscsv', 'subsplease'];
    noAuthPresets.forEach(id => {
      const preset = getPresetById(id);
      expect(preset).toBeDefined();
      const authFields = preset?.fields.filter(
        f => f.name === 'cookie' || f.name === 'username' || f.name === 'password' || f.name === 'apikey',
      );
      expect(authFields?.length).toBe(0);
    });
  });
});

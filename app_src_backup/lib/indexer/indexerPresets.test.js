import { indexerPresets, getPresetById, getPresetsByProtocol, getPopularPresets, getPresetsByPrivacy, searchPresets, } from './indexerPresets';
describe('indexerPresets', () => {
    describe('indexerPresets array', () => {
        it('should contain 53 indexer presets', () => {
            expect(indexerPresets).toHaveLength(53);
        });
        it('should have unique IDs for all presets', () => {
            const ids = indexerPresets.map((p) => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
        it('should have all required fields for each preset', () => {
            for (const preset of indexerPresets) {
                expect(preset.id).toBeDefined();
                expect(preset.name).toBeDefined();
                expect(preset.description).toBeDefined();
                expect(preset.protocol).toBe('torrent');
                expect(preset.implementation).toBeDefined();
                expect(preset.configContract).toBeDefined();
                expect(preset.privacy).toMatch(/^(Public|SemiPrivate|Private)$/);
                expect(Array.isArray(preset.fields)).toBe(true);
                expect(preset.fields.length).toBeGreaterThan(0);
                // Check that first field is always baseUrl
                expect(preset.fields[0].name).toBe('baseUrl');
                expect(preset.fields[0].type).toBe('text');
                expect(preset.fields[0].required).toBe(true);
            }
        });
    });
    describe('getPresetById', () => {
        it('should return preset by ID', () => {
            const preset = getPresetById('iptorrents');
            expect(preset).toBeDefined();
            expect(preset?.name).toBe('IPTorrents');
            expect(preset?.privacy).toBe('Private');
        });
        it('should return undefined for unknown ID', () => {
            const preset = getPresetById('unknown');
            expect(preset).toBeUndefined();
        });
        it('should return correct presets for various IDs', () => {
            expect(getPresetById('alpharatio')?.name).toBe('AlphaRatio');
            expect(getPresetById('animebytes')?.name).toBe('AnimeBytes');
            expect(getPresetById('redacted')?.name).toBe('Redacted');
        });
    });
    describe('getPresetsByProtocol', () => {
        it('should return all torrent presets', () => {
            const torrentPresets = getPresetsByProtocol('torrent');
            expect(torrentPresets.length).toBe(indexerPresets.length);
        });
        it('should return empty array for usenet', () => {
            const usenetPresets = getPresetsByProtocol('usenet');
            expect(usenetPresets).toHaveLength(0);
        });
    });
    describe('getPopularPresets', () => {
        it('should return popular presets', () => {
            const popular = getPopularPresets();
            expect(popular.length).toBeGreaterThan(0);
            expect(popular.length).toBeLessThanOrEqual(20);
        });
        it('should contain well-known indexers', () => {
            const popular = getPopularPresets();
            const names = popular.map((p) => p.name);
            expect(names).toContain('IPTorrents');
            expect(names).toContain('TorrentDay');
            expect(names).toContain('AlphaRatio');
        });
    });
    describe('getPresetsByPrivacy', () => {
        it('should return public presets', () => {
            const publicPresets = getPresetsByPrivacy('Public');
            expect(publicPresets.length).toBeGreaterThan(0);
            for (const preset of publicPresets) {
                expect(preset.privacy).toBe('Public');
            }
        });
        it('should return private presets', () => {
            const privatePresets = getPresetsByPrivacy('Private');
            expect(privatePresets.length).toBeGreaterThan(0);
            for (const preset of privatePresets) {
                expect(preset.privacy).toBe('Private');
            }
        });
        it('should return semi-private presets', () => {
            const semiPrivatePresets = getPresetsByPrivacy('SemiPrivate');
            expect(semiPrivatePresets.length).toBeGreaterThan(0);
            for (const preset of semiPrivatePresets) {
                expect(preset.privacy).toBe('SemiPrivate');
            }
        });
    });
    describe('searchPresets', () => {
        it('should search by name', () => {
            const results = searchPresets('torrent');
            expect(results.length).toBeGreaterThan(0);
            for (const preset of results) {
                expect(preset.name.toLowerCase().includes('torrent') ||
                    preset.description.toLowerCase().includes('torrent')).toBe(true);
            }
        });
        it('should search by description', () => {
            const results = searchPresets('anime');
            expect(results.length).toBeGreaterThan(0);
        });
        it('should be case insensitive', () => {
            const resultsLower = searchPresets('iptorrents');
            const resultsUpper = searchPresets('IPTORRENTS');
            expect(resultsLower.length).toBe(resultsUpper.length);
        });
        it('should return empty array for no matches', () => {
            const results = searchPresets('xyznonexistent');
            expect(results).toHaveLength(0);
        });
    });
    describe('preset fields validation', () => {
        it('should have proper field types', () => {
            for (const preset of indexerPresets) {
                for (const field of preset.fields) {
                    expect(field.name).toBeDefined();
                    expect(field.label).toBeDefined();
                    expect(['text', 'password', 'number', 'boolean']).toContain(field.type);
                }
            }
        });
        it('should have cookie field for cookie-based auth', () => {
            const iptorrents = getPresetById('iptorrents');
            expect(iptorrents?.fields.some((f) => f.name === 'cookie')).toBe(true);
        });
        it('should have username/password for userpass-based auth', () => {
            const hdspace = getPresetById('hdspace');
            expect(hdspace?.fields.some((f) => f.name === 'username')).toBe(true);
            expect(hdspace?.fields.some((f) => f.name === 'password')).toBe(true);
        });
        it('should have apiKey for api-based auth', () => {
            const beyondhd = getPresetById('beyondhd');
            expect(beyondhd?.fields.some((f) => f.name === 'apiKey')).toBe(true);
        });
    });
});
//# sourceMappingURL=indexerPresets.test.js.map
import { describe, expect, it, vi } from 'vitest';
import { createIndexerApi } from './indexerApi';
import { ApiHttpClient } from './httpClient';
// Mock the ApiHttpClient
vi.mock('./httpClient', () => {
    class MockHttpClient {
        request = vi.fn();
    }
    return {
        ApiHttpClient: MockHttpClient,
    };
});
describe('Indexer API', () => {
    const mockHttpClient = new ApiHttpClient();
    const indexerApi = createIndexerApi(mockHttpClient);
    it('should list all indexers', async () => {
        const mockIndexers = [
            {
                id: 1,
                name: 'Indexer 1',
                implementation: 'Newznab',
                configContract: 'NewznabSettings',
                settings: '{}',
                protocol: 'usenet',
                enabled: true,
                supportsRss: true,
                supportsSearch: true,
                priority: 1,
            },
            {
                id: 2,
                name: 'Indexer 2',
                implementation: 'Torznab',
                configContract: 'TorznabSettings',
                settings: '{}',
                protocol: 'torrent',
                enabled: true,
                supportsRss: true,
                supportsSearch: true,
                priority: 2,
            },
        ];
        mockHttpClient.request.mockResolvedValue(mockIndexers);
        const result = await indexerApi.list();
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/indexers',
        }, expect.anything());
        expect(result).toEqual(mockIndexers);
    });
    it('should create a new indexer', async () => {
        const mockCreatedIndexer = {
            id: 3,
            name: 'New Indexer',
            implementation: 'Newznab',
            configContract: 'NewznabSettings',
            settings: '{}',
            protocol: 'usenet',
            enabled: true,
            supportsRss: true,
            supportsSearch: true,
            priority: 1,
        };
        mockHttpClient.request.mockResolvedValue(mockCreatedIndexer);
        const input = {
            name: 'New Indexer',
            implementation: 'Newznab',
            configContract: 'NewznabSettings',
            settings: '{}',
            protocol: 'usenet',
            enabled: true,
            supportsRss: true,
            supportsSearch: true,
            priority: 1,
        };
        const result = await indexerApi.create(input);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/indexers',
            method: 'POST',
            body: input,
        }, expect.anything());
        expect(result).toEqual(mockCreatedIndexer);
    });
    it('should update an indexer', async () => {
        const mockUpdatedIndexer = {
            id: 1,
            name: 'Updated Indexer',
            implementation: 'Newznab',
            configContract: 'NewznabSettings',
            settings: '{}',
            protocol: 'usenet',
            enabled: false,
            supportsRss: true,
            supportsSearch: true,
            priority: 5,
        };
        mockHttpClient.request.mockResolvedValue(mockUpdatedIndexer);
        const updates = {
            name: 'Updated Indexer',
            enabled: false,
            priority: 5,
        };
        const result = await indexerApi.update(1, updates);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/indexers/1',
            method: 'PUT',
            body: updates,
        }, expect.anything());
        expect(result).toEqual(mockUpdatedIndexer);
    });
    it('should delete an indexer', async () => {
        mockHttpClient.request.mockResolvedValue({ id: 1 });
        const result = await indexerApi.remove(1);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/indexers/1',
            method: 'DELETE',
        }, expect.anything());
        expect(result).toEqual({ id: 1 });
    });
    it('should test an indexer connection', async () => {
        const mockTestResult = {
            success: true,
            message: 'Connection successful',
            diagnostics: {
                remediationHints: [],
            },
        };
        mockHttpClient.request.mockResolvedValue(mockTestResult);
        const result = await indexerApi.test(1);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/indexers/1/test',
            method: 'POST',
        }, expect.anything());
        expect(result).toEqual(mockTestResult);
    });
    it('should test a draft indexer configuration', async () => {
        const mockTestResult = {
            success: false,
            message: 'Connection failed',
            diagnostics: {
                remediationHints: ['Check host and port', 'Verify credentials'],
            },
        };
        mockHttpClient.request.mockResolvedValue(mockTestResult);
        const draft = {
            name: 'Test Indexer',
            implementation: 'Newznab',
            configContract: 'NewznabSettings',
            settings: '{}',
            protocol: 'usenet',
        };
        const result = await indexerApi.testDraft(draft);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/indexers/test',
            method: 'POST',
            body: draft,
        }, expect.anything());
        expect(result).toEqual(mockTestResult);
    });
});
//# sourceMappingURL=indexerApi.test.js.map
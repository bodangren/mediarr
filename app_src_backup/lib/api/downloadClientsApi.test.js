import { describe, expect, it, vi } from 'vitest';
import { createDownloadClientApi } from './downloadClientsApi';
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
describe('Download Client API', () => {
    const mockHttpClient = new ApiHttpClient();
    const downloadClientApi = createDownloadClientApi(mockHttpClient);
    it('should list all download clients', async () => {
        const mockClients = [
            {
                id: 1,
                name: 'Transmission',
                implementation: 'Transmission',
                configContract: 'TransmissionSettings',
                settings: '{}',
                protocol: 'torrent',
                host: 'localhost',
                port: 9091,
                category: 'movies',
                priority: 1,
                enabled: true,
            },
            {
                id: 2,
                name: 'qBittorrent',
                implementation: 'QBittorrent',
                configContract: 'QBittorrentSettings',
                settings: '{}',
                protocol: 'torrent',
                host: 'localhost',
                port: 8080,
                category: 'tv',
                priority: 2,
                enabled: true,
            },
        ];
        mockHttpClient.request.mockResolvedValue(mockClients);
        const result = await downloadClientApi.list();
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/download-clients',
        }, expect.anything());
        expect(result).toEqual(mockClients);
    });
    it('should create a new download client', async () => {
        const mockCreatedClient = {
            id: 3,
            name: 'SABnzbd',
            implementation: 'Sabnzbd',
            configContract: 'SabnzbdSettings',
            settings: '{}',
            protocol: 'usenet',
            host: 'localhost',
            port: 8080,
            category: 'downloads',
            priority: 1,
            enabled: true,
        };
        mockHttpClient.request.mockResolvedValue(mockCreatedClient);
        const input = {
            name: 'SABnzbd',
            implementation: 'Sabnzbd',
            configContract: 'SabnzbdSettings',
            settings: '{}',
            protocol: 'usenet',
            host: 'localhost',
            port: 8080,
            category: 'downloads',
            priority: 1,
            enabled: true,
        };
        const result = await downloadClientApi.create(input);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/download-clients',
            method: 'POST',
            body: input,
        }, expect.anything());
        expect(result).toEqual(mockCreatedClient);
    });
    it('should update a download client', async () => {
        const mockUpdatedClient = {
            id: 1,
            name: 'Transmission Updated',
            implementation: 'Transmission',
            configContract: 'TransmissionSettings',
            settings: '{}',
            protocol: 'torrent',
            host: 'localhost',
            port: 9092,
            category: 'movies',
            priority: 5,
            enabled: false,
        };
        mockHttpClient.request.mockResolvedValue(mockUpdatedClient);
        const updates = {
            name: 'Transmission Updated',
            port: 9092,
            priority: 5,
            enabled: false,
        };
        const result = await downloadClientApi.update(1, updates);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/download-clients/1',
            method: 'PUT',
            body: updates,
        }, expect.anything());
        expect(result).toEqual(mockUpdatedClient);
    });
    it('should delete a download client', async () => {
        mockHttpClient.request.mockResolvedValue({ id: 1 });
        const result = await downloadClientApi.remove(1);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/download-clients/1',
            method: 'DELETE',
        }, expect.anything());
        expect(result).toEqual({ id: 1 });
    });
    it('should test a download client connection', async () => {
        const mockTestResult = {
            success: true,
            message: 'Connection successful',
            diagnostics: {
                remediationHints: [],
            },
        };
        mockHttpClient.request.mockResolvedValue(mockTestResult);
        const result = await downloadClientApi.test(1);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/download-clients/1/test',
            method: 'POST',
        }, expect.anything());
        expect(result).toEqual(mockTestResult);
    });
    it('should test a draft download client configuration', async () => {
        const mockTestResult = {
            success: false,
            message: 'Connection failed',
            diagnostics: {
                remediationHints: ['Check host and port', 'Verify credentials'],
            },
        };
        mockHttpClient.request.mockResolvedValue(mockTestResult);
        const draft = {
            name: 'Test Client',
            implementation: 'Transmission',
            configContract: 'TransmissionSettings',
            settings: '{}',
            protocol: 'torrent',
            host: 'localhost',
            port: 9091,
        };
        const result = await downloadClientApi.testDraft(draft);
        expect(mockHttpClient.request).toHaveBeenCalledWith({
            path: '/api/download-clients/test',
            method: 'POST',
            body: draft,
        }, expect.anything());
        expect(result).toEqual(mockTestResult);
    });
});
//# sourceMappingURL=downloadClientsApi.test.js.map
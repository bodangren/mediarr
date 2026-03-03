import { describe, expect, it, vi } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createLogsApi } from './logsApi';
describe('LogsApi', () => {
    describe('listFiles', () => {
        it('should fetch log files', async () => {
            const mockRequest = vi.fn().mockResolvedValue([
                {
                    filename: 'mediarr.log',
                    size: 1024000,
                    lastModified: '2026-02-15T10:30:00Z',
                },
                {
                    filename: 'mediarr.log.1',
                    size: 2048000,
                    lastModified: '2026-02-14T22:00:00Z',
                },
                {
                    filename: 'error.log',
                    size: 512000,
                    lastModified: '2026-02-15T09:45:00Z',
                },
            ]);
            const client = new ApiHttpClient({});
            client.request = mockRequest;
            const api = createLogsApi(client);
            const result = await api.listFiles();
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/logs/files',
            }, expect.any(Object));
            expect(result).toHaveLength(3);
            expect(result[0].filename).toBe('mediarr.log');
            expect(result[0].size).toBe(1024000);
        });
    });
    describe('getFileContents', () => {
        it('should fetch log file contents', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                filename: 'mediarr.log',
                contents: '[INFO] 2026-02-15T10:30:00Z Application started\n[ERROR] 2026-02-15T10:31:00Z Failed to connect to database',
                totalLines: 2,
            });
            const client = new ApiHttpClient({});
            client.request = mockRequest;
            const api = createLogsApi(client);
            const result = await api.getFileContents('mediarr.log');
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/logs/files/mediarr.log',
                query: {},
            }, expect.any(Object));
            expect(result.filename).toBe('mediarr.log');
            expect(result.contents).toContain('Application started');
            expect(result.totalLines).toBe(2);
        });
        it('should support limit parameter', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                filename: 'mediarr.log',
                contents: 'test',
                totalLines: 1,
            });
            const client = new ApiHttpClient({});
            client.request = mockRequest;
            const api = createLogsApi(client);
            await api.getFileContents('mediarr.log', { limit: 500 });
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/logs/files/mediarr.log',
                query: { limit: 500 },
            }, expect.any(Object));
        });
    });
    describe('deleteFile', () => {
        it('should delete a log file', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                success: true,
                filename: 'mediarr.log',
            });
            const client = new ApiHttpClient({});
            client.request = mockRequest;
            const api = createLogsApi(client);
            const result = await api.deleteFile('mediarr.log');
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/logs/files/mediarr.log',
                method: 'DELETE',
            }, expect.any(Object));
            expect(result.success).toBe(true);
        });
    });
    describe('clearFile', () => {
        it('should clear log file contents', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                success: true,
                filename: 'mediarr.log',
            });
            const client = new ApiHttpClient({});
            client.request = mockRequest;
            const api = createLogsApi(client);
            const result = await api.clearFile('mediarr.log');
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/logs/files/mediarr.log/clear',
                method: 'POST',
            }, expect.any(Object));
            expect(result.success).toBe(true);
        });
    });
    describe('downloadFile', () => {
        it('should return download URL for a log file', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                downloadUrl: '/api/logs/files/mediarr.log/download',
                filename: 'mediarr.log',
            });
            const client = new ApiHttpClient({});
            client.request = mockRequest;
            const api = createLogsApi(client);
            const result = await api.downloadFile('mediarr.log');
            expect(mockRequest).toHaveBeenCalledWith({
                path: '/api/logs/files/mediarr.log/download',
            }, expect.any(Object));
            expect(result.downloadUrl).toBe('/api/logs/files/mediarr.log/download');
        });
    });
});
//# sourceMappingURL=logsApi.test.js.map
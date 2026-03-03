import { describe, expect, it, vi } from 'vitest';
import { createTagsApi } from './tagsApi';
describe('tagsApi', () => {
    const mockClient = {
        request: vi.fn(),
    };
    const api = createTagsApi(mockClient);
    describe('list', () => {
        it('should fetch all tags', async () => {
            const mockTags = [
                {
                    id: 1,
                    label: 'HD Movies',
                    color: '#FF5733',
                    indexerIds: [1, 2],
                    applicationIds: [3],
                    downloadClientIds: [],
                },
                {
                    id: 2,
                    label: 'TV Shows',
                    color: '#33FF57',
                    indexerIds: [3],
                    applicationIds: [1, 2],
                    downloadClientIds: [1],
                },
            ];
            mockClient.request.mockResolvedValue(mockTags);
            const result = await api.list();
            expect(result).toEqual(mockTags);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/tags',
            }), expect.anything());
        });
    });
    describe('create', () => {
        it('should create a new tag', async () => {
            const input = {
                label: 'New Tag',
                color: '#00FF00',
            };
            const mockResult = {
                id: 3,
                label: 'New Tag',
                color: '#00FF00',
                indexerIds: [],
                applicationIds: [],
                downloadClientIds: [],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.create(input);
            expect(result).toEqual(mockResult);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/tags',
                method: 'POST',
                body: input,
            }), expect.anything());
        });
    });
    describe('update', () => {
        it('should update an existing tag', async () => {
            const input = {
                label: 'Updated Tag',
                color: '#0000FF',
            };
            const mockResult = {
                id: 1,
                label: 'Updated Tag',
                color: '#0000FF',
                indexerIds: [1, 2],
                applicationIds: [3],
                downloadClientIds: [],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.update(1, input);
            expect(result).toEqual(mockResult);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/tags/1',
                method: 'PUT',
                body: input,
            }), expect.anything());
        });
    });
    describe('remove', () => {
        it('should delete a tag', async () => {
            const mockResult = { id: 1 };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.remove(1);
            expect(result).toEqual(mockResult);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/tags/1',
                method: 'DELETE',
            }), expect.anything());
        });
    });
    describe('getDetails', () => {
        it('should fetch tag details with assignments', async () => {
            const mockDetails = {
                tag: {
                    id: 1,
                    label: 'HD Movies',
                    color: '#FF5733',
                },
                indexers: [
                    { id: 1, name: 'The Pirate Bay' },
                    { id: 2, name: 'RARBG' },
                ],
                applications: [
                    { id: 3, name: 'My Radarr' },
                ],
                downloadClients: [],
            };
            mockClient.request.mockResolvedValue(mockDetails);
            const result = await api.getDetails(1);
            expect(result).toEqual(mockDetails);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/tags/1/details',
            }), expect.anything());
        });
    });
    describe('updateAssignments', () => {
        it('should update tag assignments', async () => {
            const input = {
                indexerIds: [1, 2, 3],
                applicationIds: [3, 4],
                downloadClientIds: [1],
            };
            const mockResult = {
                id: 1,
                label: 'HD Movies',
                color: '#FF5733',
                indexerIds: [1, 2, 3],
                applicationIds: [3, 4],
                downloadClientIds: [1],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.updateAssignments(1, input);
            expect(result).toEqual(mockResult);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/tags/1/assignments',
                method: 'PUT',
                body: input,
            }), expect.anything());
        });
    });
});
//# sourceMappingURL=tagsApi.test.js.map
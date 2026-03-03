import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useEventsCacheBridge } from './useEventsCacheBridge';
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(),
}));
const mockedGetApiClients = vi.mocked(getApiClients);
function Harness() {
    useEventsCacheBridge();
    return null;
}
describe('useEventsCacheBridge', () => {
    it('subscribes to prowlarr realtime events', () => {
        const handlers = {};
        const eventsApi = {
            on: vi.fn((event, handler) => {
                handlers[event] = handler;
                return vi.fn();
            }),
            connect: vi.fn(),
            disconnect: vi.fn(),
        };
        mockedGetApiClients.mockReturnValue({ eventsApi });
        const queryClient = new QueryClient();
        render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(Harness, {}) }));
        expect(eventsApi.on).toHaveBeenCalledWith('indexer:added', expect.any(Function));
        expect(eventsApi.on).toHaveBeenCalledWith('indexer:updated', expect.any(Function));
        expect(eventsApi.on).toHaveBeenCalledWith('indexer:deleted', expect.any(Function));
        expect(eventsApi.on).toHaveBeenCalledWith('indexer:healthChanged', expect.any(Function));
        expect(eventsApi.on).toHaveBeenCalledWith('command:started', expect.any(Function));
        expect(eventsApi.on).toHaveBeenCalledWith('command:completed', expect.any(Function));
        expect(eventsApi.connect).toHaveBeenCalledTimes(1);
    });
    it('invalidates indexer, health, system, and task keys for new events', () => {
        const handlers = {};
        const eventsApi = {
            on: vi.fn((event, handler) => {
                handlers[event] = handler;
                return vi.fn();
            }),
            connect: vi.fn(),
            disconnect: vi.fn(),
        };
        mockedGetApiClients.mockReturnValue({ eventsApi });
        const queryClient = new QueryClient();
        const invalidateQueriesSpy = vi
            .spyOn(queryClient, 'invalidateQueries')
            .mockResolvedValue(undefined);
        render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(Harness, {}) }));
        handlers['indexer:added']?.({ indexerId: 1 });
        handlers['command:completed']?.({ commandId: 99 });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.indexers() });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.health() });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.systemStatus() });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasksScheduled() });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tasksQueued() });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['tasks', 'history'] });
    });
});
//# sourceMappingURL=useEventsCacheBridge.test.js.map
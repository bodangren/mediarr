import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueActions } from './QueueActions';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Hoist mocks
const mocks = vi.hoisted(() => ({
    pause: vi.fn().mockResolvedValue({}),
    resume: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({})
}));
vi.mock('@/lib/api/client', () => ({
    getApiClients: () => ({
        torrentApi: {
            pause: mocks.pause,
            resume: mocks.resume,
            remove: mocks.remove,
        }
    })
}));
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
    },
});
describe('QueueActions', () => {
    it('calls pause API when Pause button clicked', async () => {
        const user = userEvent.setup();
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(QueueActions, { infoHash: "123", status: "downloading" }) }));
        await user.click(screen.getByText(/Pause/i));
        await waitFor(() => expect(mocks.pause).toHaveBeenCalledWith("123"));
    });
    it('calls resume API when Resume button clicked', async () => {
        const user = userEvent.setup();
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(QueueActions, { infoHash: "123", status: "paused" }) }));
        await user.click(screen.getByText(/Resume/i));
        await waitFor(() => expect(mocks.resume).toHaveBeenCalledWith("123"));
    });
    it('calls remove API when Remove button clicked', async () => {
        const user = userEvent.setup();
        const client = createTestQueryClient();
        render(_jsx(QueryClientProvider, { client: client, children: _jsx(QueueActions, { infoHash: "123", status: "downloading" }) }));
        await user.click(screen.getByText(/Remove/i));
        await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("123"));
    });
});
//# sourceMappingURL=queue-actions.test.js.map
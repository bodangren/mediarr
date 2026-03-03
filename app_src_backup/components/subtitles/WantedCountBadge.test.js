import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WantedCountBadge } from './WantedCountBadge';
// Mock the API clients and hooks
vi.mock('@/lib/api/client', () => ({
    getApiClients: vi.fn(() => ({
        subtitleWantedApi: {
            getWantedCount: vi.fn(),
        },
    })),
}));
vi.mock('@/lib/query/queryKeys', () => ({
    queryKeys: {
        subtitleWantedCount: () => ['subtitle-wanted', 'count'],
    },
}));
vi.mock('@/lib/query/useApiQuery', () => ({
    useApiQuery: vi.fn(),
}));
const { useApiQuery } = await import('@/lib/query/useApiQuery');
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
}
function renderWithProviders(ui) {
    const queryClient = createTestQueryClient();
    return render(_jsx(QueryClientProvider, { client: queryClient, children: ui }));
}
describe('WantedCountBadge', () => {
    it('should not render when count is 0', () => {
        vi.mocked(useApiQuery).mockReturnValue({
            data: { totalCount: 0 },
            isLoading: false,
            isError: false,
            isPending: false,
            isSuccess: true,
            isResolvedEmpty: true,
            refetch: vi.fn(),
        });
        const { container } = renderWithProviders(_jsx(WantedCountBadge, {}));
        expect(container.firstChild).toBeNull();
    });
    it('should render count badge with positive count', () => {
        vi.mocked(useApiQuery).mockReturnValue({
            data: { totalCount: 5 },
            isLoading: false,
            isError: false,
            isPending: false,
            isSuccess: true,
            isResolvedEmpty: false,
            refetch: vi.fn(),
        });
        renderWithProviders(_jsx(WantedCountBadge, {}));
        const badge = screen.getByText('5');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute('aria-label', '5 missing subtitles');
    });
    it('should not render when data is undefined', () => {
        vi.mocked(useApiQuery).mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            isPending: true,
            isSuccess: false,
            isResolvedEmpty: false,
            refetch: vi.fn(),
        });
        const { container } = renderWithProviders(_jsx(WantedCountBadge, {}));
        expect(container.firstChild).toBeNull();
    });
    it('should apply custom className', () => {
        vi.mocked(useApiQuery).mockReturnValue({
            data: { totalCount: 10 },
            isLoading: false,
            isError: false,
            isPending: false,
            isSuccess: true,
            isResolvedEmpty: false,
            refetch: vi.fn(),
        });
        renderWithProviders(_jsx(WantedCountBadge, { className: "custom-class" }));
        const badge = screen.getByText('10');
        expect(badge).toHaveClass('custom-class');
    });
    it('should poll every 30 seconds', () => {
        const mockUseApiQueryFn = vi.fn().mockReturnValue({
            data: { totalCount: 5 },
            isLoading: false,
            isError: false,
            isPending: false,
            isSuccess: true,
            isResolvedEmpty: false,
            refetch: vi.fn(),
        });
        vi.mocked(useApiQuery).mockImplementation(mockUseApiQueryFn);
        renderWithProviders(_jsx(WantedCountBadge, {}));
        expect(mockUseApiQueryFn).toHaveBeenCalledWith(expect.objectContaining({
            refetchInterval: 30_000,
        }));
    });
});
//# sourceMappingURL=WantedCountBadge.test.js.map
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from '@/lib/msw/server';
// Stub window.confirm for tests
beforeAll(() => {
    window.confirm = vi.fn(() => true);
    server.listen({
        onUnhandledRequest: 'error',
    });
});
afterEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
});
afterAll(() => {
    server.close();
});
//# sourceMappingURL=setup.js.map
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useEventsCacheBridge } from '@/lib/events/useEventsCacheBridge';
import { createQueryClient } from '@/lib/query/queryClient';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { ToastProvider } from './ToastProvider';
function EventsBridgeMount() {
    useEventsCacheBridge();
    return null;
}
export function AppProviders({ children }) {
    const [queryClient] = useState(() => createQueryClient());
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }
        if (process.env.NEXT_PUBLIC_USE_MSW !== 'true') {
            return;
        }
        void import('@/lib/msw/browser').then(({ worker }) => {
            return worker.start({
                onUnhandledRequest: 'bypass',
            });
        });
    }, []);
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ThemeProvider, { children: _jsxs(ToastProvider, { children: [_jsx(EventsBridgeMount, {}), children] }) }) }));
}
//# sourceMappingURL=AppProviders.js.map
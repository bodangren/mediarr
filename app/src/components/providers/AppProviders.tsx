'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useEventsCacheBridge } from '@/lib/events/useEventsCacheBridge';
import { createQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from './ToastProvider';

function EventsBridgeMount(): null {
  useEventsCacheBridge();
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
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

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EventsBridgeMount />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}

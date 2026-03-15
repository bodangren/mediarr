
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useEventsCacheBridge } from '@/lib/events/useEventsCacheBridge';
import { createQueryClient } from '@/lib/query/queryClient';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { ToastProvider } from './ToastProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

function EventsBridgeMount(): null {
  useEventsCacheBridge();
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    if (import.meta.env.VITE_USE_MSW !== 'true') {
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
      <ThemeProvider>
        <TooltipProvider delayDuration={500}>
          <ToastProvider>
            <EventsBridgeMount />
            {children}
          </ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';

interface HealthPayload {
  ok: boolean;
  uptime: number;
}

export default function Home() {
  const apiBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
  }, []);

  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [counter, setCounter] = useState<number | null>(null);
  const [streamState, setStreamState] = useState<'connecting' | 'open' | 'closed'>('connecting');

  useEffect(() => {
    let cancelled = false;

    fetch(`${apiBaseUrl}/api/health`)
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Health request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((payload: HealthPayload) => {
        if (!cancelled) {
          setHealth(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    const eventSource = new EventSource(`${apiBaseUrl}/api/events/stream`);

    eventSource.addEventListener('open', () => {
      setStreamState('open');
    });

    eventSource.addEventListener('heartbeat', event => {
      try {
        const parsed = JSON.parse((event as MessageEvent<string>).data) as { counter: number };
        setCounter(parsed.counter);
      } catch {
        // Keep UI stable if malformed event data appears.
      }
    });

    eventSource.addEventListener('error', () => {
      setStreamState('closed');
    });

    return () => {
      eventSource.close();
      setStreamState('closed');
    };
  }, [apiBaseUrl]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Mediarr Platform Spike</h1>
      <p className="text-sm text-slate-600">
        Frontend is connected to Fastify backend at <code>{apiBaseUrl}</code>.
      </p>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-lg font-medium">Health</h2>
        <p>OK: {String(health?.ok ?? false)}</p>
        <p>Uptime: {health ? `${health.uptime.toFixed(2)}s` : 'unavailable'}</p>
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-lg font-medium">SSE Heartbeat</h2>
        <p>Stream: {streamState}</p>
        <p>Counter: {counter ?? 'waiting...'}</p>
      </section>
    </main>
  );
}

import { describe, it, expect } from 'vitest';
import { ProcessModelSpikeServer } from '../server/src/spike/ProcessModelSpikeServer';

async function readFirstCounter(streamUrl) {
  const controller = new AbortController();
  const response = await fetch(streamUrl, { signal: controller.signal });
  if (!response.body) {
    controller.abort();
    throw new Error('Missing response stream body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const match = buffer.match(/"counter"\s*:\s*(\d+)/);
    if (match) {
      controller.abort();
      return Number(match[1]);
    }
  }

  controller.abort();
  throw new Error('Counter was not found in stream payload');
}

describe('ProcessModelSpikeServer', () => {
  it('should expose health endpoint and keep heartbeat counter monotonic across requests', { timeout: 15000 }, async () => {
    const spike = new ProcessModelSpikeServer({ heartbeatIntervalMs: 150 });
    const address = await spike.start(0);

    try {
      const healthResponse = await fetch(`${address}/api/health`);
      const health = await healthResponse.json();

      expect(healthResponse.ok).toBe(true);
      expect(health.ok).toBe(true);
      expect(typeof health.uptime).toBe('number');

      const first = await readFirstCounter(`${address}/api/events/stream`);
      await new Promise(resolve => setTimeout(resolve, 220));
      const second = await readFirstCounter(`${address}/api/events/stream`);

      expect(second).toBeGreaterThan(first);
    } finally {
      await spike.stop();
    }
  });
});

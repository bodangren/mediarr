import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiEventHub } from './eventHub';
import type { ServerResponse } from 'node:http';

function makeClient(writeFn?: () => void): ServerResponse {
  return {
    write: writeFn ?? vi.fn(),
    end: vi.fn(),
  } as unknown as ServerResponse;
}

describe('ApiEventHub', () => {
  let hub: ApiEventHub;

  beforeEach(() => {
    hub = new ApiEventHub(60000);
  });

  it('broadcasts an SSE frame to all connected clients', () => {
    const write1 = vi.fn();
    const write2 = vi.fn();
    hub.addClient(makeClient(write1));
    hub.addClient(makeClient(write2));

    hub.publish('test', { hello: 'world' });

    expect(write1).toHaveBeenCalledOnce();
    expect(write2).toHaveBeenCalledOnce();
    const frame: string = write1.mock.calls[0][0];
    expect(frame).toContain('event: test\n');
    expect(frame).toContain('"hello":"world"');
    expect(frame.endsWith('\n\n')).toBe(true);
  });

  it('removes a client that throws on write', () => {
    const badClient = makeClient(() => { throw new Error('pipe broken'); });
    hub.addClient(badClient);
    expect(hub.clientCount).toBe(1);

    hub.publish('test', {});
    expect(hub.clientCount).toBe(0);
  });

  it('does NOT throw when publish receives a circular-reference payload', () => {
    const write = vi.fn();
    hub.addClient(makeClient(write));

    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    expect(() => hub.publish('test', circular)).not.toThrow();
    expect(write).toHaveBeenCalledOnce();
    const frame: string = write.mock.calls[0][0];
    expect(frame).toContain('"error":"serialization_failed"');
  });

  it('clientCount reflects additions and removals', () => {
    const c1 = makeClient();
    const c2 = makeClient();
    expect(hub.clientCount).toBe(0);
    hub.addClient(c1);
    expect(hub.clientCount).toBe(1);
    hub.addClient(c2);
    expect(hub.clientCount).toBe(2);
    hub.removeClient(c1);
    expect(hub.clientCount).toBe(1);
  });

  it('close() ends all clients and clears the set', () => {
    const end1 = vi.fn();
    const end2 = vi.fn();
    hub.addClient({ write: vi.fn(), end: end1 } as unknown as ServerResponse);
    hub.addClient({ write: vi.fn(), end: end2 } as unknown as ServerResponse);

    hub.close();
    expect(end1).toHaveBeenCalledOnce();
    expect(end2).toHaveBeenCalledOnce();
    expect(hub.clientCount).toBe(0);
  });
});

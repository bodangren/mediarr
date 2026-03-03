import { describe, expect, it, vi } from 'vitest';
import { createEventsApi } from './eventsApi';
function createFakeEventSource() {
    const listeners = new Map();
    return {
        source: {
            addEventListener: (type, listener) => {
                const existing = listeners.get(type) ?? [];
                existing.push(listener);
                listeners.set(type, existing);
            },
            close: vi.fn(),
        },
        emit: (type, payload) => {
            const handlers = listeners.get(type) ?? [];
            for (const handler of handlers) {
                handler({
                    data: JSON.stringify(payload),
                });
            }
        },
    };
}
describe('EventsApiClient', () => {
    it('parses and dispatches indexer added events', () => {
        const fake = createFakeEventSource();
        const factory = vi.fn(() => fake.source);
        const api = createEventsApi({
            eventSourceFactory: factory,
        });
        const handler = vi.fn();
        api.on('indexer:added', handler);
        api.connect();
        fake.emit('indexer:added', {
            indexerId: 42,
            indexerName: 'Nyaa',
            enable: true,
        });
        expect(factory).toHaveBeenCalledWith('/api/events/stream');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
            indexerId: 42,
            indexerName: 'Nyaa',
        }));
    });
});
//# sourceMappingURL=eventsApi.test.js.map
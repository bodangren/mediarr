import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogReaderService } from './LogReaderService';

describe('LogReaderService', () => {
  let service: LogReaderService;

  beforeEach(() => {
    service = new LogReaderService();
  });

  it('starts with an empty buffer', () => {
    const result = service.getEntries();
    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it('appends entries via push', () => {
    service.push('info', 'hello');
    service.push('error', 'boom');
    const result = service.getEntries();
    expect(result.totalCount).toBe(2);
  });

  it('returns entries newest-first', () => {
    service.push('info', 'first');
    service.push('warn', 'second');
    const result = service.getEntries();
    expect(result.items[0]?.message).toBe('second');
    expect(result.items[1]?.message).toBe('first');
  });

  it('filters by level', () => {
    service.push('info', 'info msg');
    service.push('error', 'error msg');
    const result = service.getEntries({ level: 'error' });
    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.level).toBe('error');
  });

  it('filters by search text (case-insensitive)', () => {
    service.push('info', 'RSS sync started');
    service.push('info', 'Torrent added');
    const result = service.getEntries({ search: 'rss' });
    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.message).toBe('RSS sync started');
  });

  it('paginates results', () => {
    for (let i = 0; i < 10; i++) {
      service.push('info', `msg ${i}`);
    }
    const page1 = service.getEntries({}, 1, 3);
    const page2 = service.getEntries({}, 2, 3);
    expect(page1.items).toHaveLength(3);
    expect(page2.items).toHaveLength(3);
    expect(page1.totalCount).toBe(10);
  });

  it('assigns incrementing ids', () => {
    service.push('info', 'a');
    service.push('info', 'b');
    const result = service.getEntries();
    const ids = result.items.map(e => e.id);
    expect(ids[0]).toBeGreaterThan(ids[1]!); // newest-first means higher id first
  });

  it('captures console output once when installed', () => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    try {
      service.install();
      service.install();
      console.log('started', 1);
      console.warn('slow indexer');
      console.error('database failed');
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }

    const result = service.getEntries();
    expect(result.items.map(entry => [entry.level, entry.message])).toEqual([
      ['error', 'database failed'],
      ['warn', 'slow indexer'],
      ['info', 'started 1'],
    ]);
  });

  it('evicts the oldest entry when the ring buffer reaches capacity', () => {
    for (let index = 0; index <= 2000; index += 1) {
      service.push('debug', `message ${index}`);
    }

    const result = service.getEntries({}, 1, 2001);
    expect(result.totalCount).toBe(2000);
    expect(result.items.at(-1)?.message).toBe('message 1');
    expect(result.items[0]?.message).toBe('message 2000');
  });

  it('filters entries by start and end timestamps', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-24T01:00:00.000Z'));
      service.push('info', 'early');
      vi.setSystemTime(new Date('2026-07-24T03:00:00.000Z'));
      service.push('info', 'late');

      expect(service.getEntries({ startDate: '2026-07-24T02:00:00.000Z' }).items)
        .toHaveLength(1);
      expect(service.getEntries({ endDate: '2026-07-24T02:00:00.000Z' }).items)
        .toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

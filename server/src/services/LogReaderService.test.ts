import { describe, it, expect, beforeEach } from 'vitest';
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
});

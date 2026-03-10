import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationDispatchService, type EventPublisher } from './NotificationDispatchService';

function makeHub(): { publish: ReturnType<typeof vi.fn> } & EventPublisher {
  return { publish: vi.fn() };
}

describe('NotificationDispatchService', () => {
  let hub: ReturnType<typeof makeHub>;
  let svc: NotificationDispatchService;

  beforeEach(() => {
    hub = makeHub();
    svc = new NotificationDispatchService(hub);
  });

  describe('notifyGrab', () => {
    it('publishes notification:grab with title and optional fields', () => {
      svc.notifyGrab({ title: 'My Movie', indexer: 'TestIndexer', size: 1024 * 1024, quality: '1080p' });
      expect(hub.publish).toHaveBeenCalledOnce();
      const [event, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(event).toBe('notification:grab');
      expect(payload.title).toBe('My Movie');
      expect(payload.indexer).toBe('TestIndexer');
      expect(payload.quality).toBe('1080p');
      expect(payload.sizeFormatted).toBe('1.0 MB');
    });

    it('publishes notification:grab with null optional fields when omitted', () => {
      svc.notifyGrab({ title: 'Minimal' });
      const [, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(payload.indexer).toBeNull();
      expect(payload.quality).toBeNull();
      expect(payload.size).toBeNull();
      expect(payload.sizeFormatted).toBeNull();
    });

    it('does not throw when hub.publish throws', () => {
      hub.publish.mockImplementation(() => { throw new Error('hub error'); });
      expect(() => svc.notifyGrab({ title: 'Movie' })).not.toThrow();
    });
  });

  describe('notifyDownload', () => {
    it('publishes notification:download for new download', () => {
      svc.notifyDownload({ title: 'Movie', mediaType: 'movie' });
      const [event, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(event).toBe('notification:download');
      expect(payload.title).toBe('Movie');
      expect(payload.mediaType).toBe('movie');
      expect(payload.isUpgrade).toBe(false);
    });

    it('publishes notification:download with isUpgrade=true for upgrades', () => {
      svc.notifyDownload({ title: 'Movie', mediaType: 'movie', isUpgrade: true });
      const [, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(payload.isUpgrade).toBe(true);
    });

    it('publishes notification:download for episode type', () => {
      svc.notifyDownload({ title: 'Breaking Bad S01E01', mediaType: 'episode' });
      const [, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(payload.mediaType).toBe('episode');
    });

    it('does not throw when hub.publish throws', () => {
      hub.publish.mockImplementation(() => { throw new Error('hub error'); });
      expect(() => svc.notifyDownload({ title: 'Movie', mediaType: 'movie' })).not.toThrow();
    });
  });

  describe('notifySeriesAdd', () => {
    it('publishes notification:seriesAdd with title and year', () => {
      svc.notifySeriesAdd({ title: 'Breaking Bad', year: 2008 });
      const [event, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(event).toBe('notification:seriesAdd');
      expect(payload.title).toBe('Breaking Bad');
      expect(payload.year).toBe(2008);
    });

    it('publishes notification:seriesAdd with null year when omitted', () => {
      svc.notifySeriesAdd({ title: 'Unknown Series' });
      const [, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(payload.year).toBeNull();
    });
  });

  describe('notifyEpisodeDelete', () => {
    it('publishes notification:episodeDelete with formatted episode ref', () => {
      svc.notifyEpisodeDelete({ seriesTitle: 'Breaking Bad', seasonNumber: 3, episodeNumber: 10 });
      const [event, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(event).toBe('notification:episodeDelete');
      expect(payload.seriesTitle).toBe('Breaking Bad');
      expect(payload.episodeRef).toBe('S03E10');
      expect(payload.seasonNumber).toBe(3);
      expect(payload.episodeNumber).toBe(10);
    });

    it('falls back to episodeTitle when season/episode numbers are absent', () => {
      svc.notifyEpisodeDelete({ seriesTitle: 'Breaking Bad', episodeTitle: 'Ozymandias' });
      const [, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(payload.episodeRef).toBe('Ozymandias');
    });

    it('falls back to "unknown episode" when all episode identifiers are absent', () => {
      svc.notifyEpisodeDelete({ seriesTitle: 'Breaking Bad' });
      const [, payload] = hub.publish.mock.calls[0] as [string, Record<string, unknown>];
      expect(payload.episodeRef).toBe('unknown episode');
    });
  });
});

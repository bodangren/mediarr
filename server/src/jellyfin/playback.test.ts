import { describe, expect, it, vi } from 'vitest';
import {
  buildDirectPlayMediaSource,
  decodePlaybackTarget,
  UnsupportedJellyfinPlaybackItemError,
} from './playback';
import { encodeJellyfinId, JELLYFIN_MOVIE_VIEW_ID } from './ids';

describe('decodePlaybackTarget', () => {
  it('decodes stable movie and episode ids to the existing playback target contract', () => {
    expect(decodePlaybackTarget(encodeJellyfinId('movie', 42))).toEqual({
      mediaType: 'MOVIE',
      mediaId: 42,
    });
    expect(decodePlaybackTarget(encodeJellyfinId('episode', 84))).toEqual({
      mediaType: 'EPISODE',
      mediaId: 84,
    });
  });

  it.each([
    encodeJellyfinId('series', 1),
    encodeJellyfinId('season', 1),
    JELLYFIN_MOVIE_VIEW_ID,
    '00000000-0000-0000-0000-000000000000',
    'not-an-id',
  ])('rejects a non-playable Jellyfin id: %s', itemId => {
    expect(decodePlaybackTarget(itemId)).toBeNull();
  });
});

describe('buildDirectPlayMediaSource', () => {
  it('resolves a movie through PlaybackService and returns a direct-play-only MediaSource', async () => {
    const itemId = encodeJellyfinId('movie', 42);
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 42,
      title: 'A Movie',
      filePath: '/data/media/movies/A Movie/movie.mp4',
    });

    const source = await buildDirectPlayMediaSource(itemId, resolveStreamSource);

    expect(resolveStreamSource).toHaveBeenCalledWith({
      mediaType: 'MOVIE',
      mediaId: 42,
    });
    expect(source).toEqual({
      Id: itemId,
      Name: 'A Movie',
      Path: '/data/media/movies/A Movie/movie.mp4',
      Protocol: 'File',
      Type: 'Default',
      Container: 'mp4',
      SupportsDirectPlay: true,
      SupportsDirectStream: true,
      SupportsTranscoding: false,
      IsRemote: false,
      ReadAtNativeFramerate: false,
      IgnoreDts: false,
      IgnoreIndex: false,
      GenPtsInput: false,
      IsInfiniteStream: false,
      RequiresOpening: false,
      RequiresClosing: false,
      RequiresLooping: false,
      SupportsProbing: false,
      HasSegments: false,
      MediaStreams: [],
      DirectStreamUrl: `/Videos/${itemId}/stream`,
    });
  });

  it('preserves the stable episode id and derives a Jellyfin container from the file extension', async () => {
    const itemId = encodeJellyfinId('episode', 7);
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'EPISODE',
      mediaId: 7,
      title: 'Series S01E02 - Episode',
      filePath: '/data/media/tv/Series/episode.MKV',
    });

    const source = await buildDirectPlayMediaSource(itemId, resolveStreamSource);

    expect(source.Id).toBe(itemId);
    expect(source.Container).toBe('mkv');
    expect(source.DirectStreamUrl).toBe(`/Videos/${itemId}/stream`);
  });

  it('normalizes common extension aliases without inventing transcoding', async () => {
    const itemId = encodeJellyfinId('movie', 9);
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 9,
      title: 'Alias',
      filePath: '/data/media/movies/Alias/video.m4v',
    });

    const source = await buildDirectPlayMediaSource(itemId, resolveStreamSource);

    expect(source.Container).toBe('mp4');
    expect(source.SupportsTranscoding).toBe(false);
    expect(source).not.toHaveProperty('TranscodingUrl');
  });

  it('fails before resolution for unsupported stable or foreign ids', async () => {
    const resolveStreamSource = vi.fn();

    await expect(buildDirectPlayMediaSource(
      encodeJellyfinId('series', 1),
      resolveStreamSource,
    )).rejects.toBeInstanceOf(UnsupportedJellyfinPlaybackItemError);
    await expect(buildDirectPlayMediaSource(
      'foreign',
      resolveStreamSource,
    )).rejects.toThrow('Unsupported Jellyfin playback item id');

    expect(resolveStreamSource).not.toHaveBeenCalled();
  });

  it('rejects a resolver result that does not match the decoded stable id', async () => {
    const itemId = encodeJellyfinId('episode', 7);
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 7,
      title: 'Wrong target',
      filePath: '/data/media/wrong.mp4',
    });

    await expect(buildDirectPlayMediaSource(itemId, resolveStreamSource))
      .rejects.toThrow('did not match requested item');
  });

  it('rejects a stream source with no usable file extension', async () => {
    const itemId = encodeJellyfinId('movie', 11);
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 11,
      title: 'No Extension',
      filePath: '/data/media/movies/no-extension',
    });

    await expect(buildDirectPlayMediaSource(itemId, resolveStreamSource))
      .rejects.toThrow('playable file extension');
  });
});

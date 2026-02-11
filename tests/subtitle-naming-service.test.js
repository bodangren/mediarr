import { describe, it, expect } from 'vitest';
import { SubtitleNamingService } from '../server/src/services/SubtitleNamingService';

describe('SubtitleNamingService', () => {
  it('should build standard sidecar path when no collision exists', () => {
    const service = new SubtitleNamingService();
    const result = service.buildSubtitlePath({
      videoPath: '/data/media/movies/Movie (2020)/movie.2020.1080p.mkv',
      languageCode: 'en',
      isForced: false,
      isHi: false,
      variantToken: '1080p-bluray',
      existingPaths: [],
    });

    expect(result).toBe(
      '/data/media/movies/Movie (2020)/movie.2020.1080p.en.srt',
    );
  });

  it('should append deterministic variant suffix when collision exists', () => {
    const service = new SubtitleNamingService();
    const result = service.buildSubtitlePath({
      videoPath: '/data/media/movies/Movie (2020)/movie.mkv',
      languageCode: 'en',
      isForced: false,
      isHi: false,
      variantToken: '2160P WEB-DL',
      existingPaths: ['/data/media/movies/Movie (2020)/movie.en.srt'],
    });

    expect(result).toBe(
      '/data/media/movies/Movie (2020)/movie.2160p-web-dl.en.srt',
    );
  });
});

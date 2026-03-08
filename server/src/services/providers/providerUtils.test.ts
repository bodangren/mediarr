import { describe, expect, it } from 'vitest';
import {
  ALLOWED_SUBTITLE_EXTENSIONS,
  PROVIDER_IDS,
  deriveReleaseName,
  extractExtension,
  readNumericProviderData,
} from './providerUtils';

describe('deriveReleaseName', () => {
  it('strips directory components and extension', () => {
    expect(deriveReleaseName('/data/media/movies/Movie.2021.1080p.mkv')).toBe('Movie.2021.1080p');
  });

  it('handles a bare filename', () => {
    expect(deriveReleaseName('Release.Name.srt')).toBe('Release.Name');
  });

  it('handles a path with no extension', () => {
    expect(deriveReleaseName('/some/path/NoExtension')).toBe('NoExtension');
  });
});

describe('extractExtension', () => {
  it('returns lower-case extension from a filename', () => {
    expect(extractExtension('Sub.SRT')).toBe('.srt');
    expect(extractExtension('file.ASS')).toBe('.ass');
  });

  it('returns undefined for undefined input', () => {
    expect(extractExtension(undefined)).toBeUndefined();
  });

  it('returns undefined when filename has no extension', () => {
    expect(extractExtension('noextension')).toBeUndefined();
  });
});

describe('readNumericProviderData', () => {
  it('reads a number value by key', () => {
    expect(readNumericProviderData({ id: 42 }, 'id')).toBe(42);
  });

  it('parses a numeric string', () => {
    expect(readNumericProviderData({ id: '99' }, 'id')).toBe(99);
  });

  it('returns null for missing key', () => {
    expect(readNumericProviderData({}, 'id')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(readNumericProviderData({ id: 'abc' }, 'id')).toBeNull();
  });

  it('returns null when providerData is undefined', () => {
    expect(readNumericProviderData(undefined, 'id')).toBeNull();
  });
});

describe('ALLOWED_SUBTITLE_EXTENSIONS', () => {
  it('contains standard subtitle extensions', () => {
    expect(ALLOWED_SUBTITLE_EXTENSIONS.has('.srt')).toBe(true);
    expect(ALLOWED_SUBTITLE_EXTENSIONS.has('.ass')).toBe(true);
    expect(ALLOWED_SUBTITLE_EXTENSIONS.has('.vtt')).toBe(true);
    expect(ALLOWED_SUBTITLE_EXTENSIONS.has('.mp4')).toBe(false);
  });
});

describe('PROVIDER_IDS', () => {
  it('defines all expected provider identifiers', () => {
    expect(PROVIDER_IDS.OPENSUBTITLES).toBe('opensubtitles');
    expect(PROVIDER_IDS.ASSRT).toBe('assrt');
    expect(PROVIDER_IDS.SUBDL).toBe('subdl');
    expect(PROVIDER_IDS.EMBEDDED).toBe('embedded');
  });
});

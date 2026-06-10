import { describe, expect, it } from 'vitest';
import { isPathWithinRoots } from './pathValidation';

const POSIX_ROOTS = ['/srv/media', '/var/lib/mediarr/torrents'];

describe('isPathWithinRoots (FR-5.1)', () => {
  it('accepts a path that is identical to a root', () => {
    expect(isPathWithinRoots('/srv/media', POSIX_ROOTS)).toBe(true);
  });

  it('accepts a path nested inside a root', () => {
    expect(isPathWithinRoots('/srv/media/tv/Show/Season 01', POSIX_ROOTS)).toBe(true);
    expect(isPathWithinRoots('/var/lib/mediarr/torrents/abc.torrent', POSIX_ROOTS)).toBe(true);
  });

  it('rejects a relative-path traversal payload', () => {
    expect(isPathWithinRoots('../../etc/passwd', POSIX_ROOTS)).toBe(false);
  });

  it('rejects an absolute path that escapes every root', () => {
    expect(isPathWithinRoots('/etc/passwd', POSIX_ROOTS)).toBe(false);
    expect(isPathWithinRoots('/home/other-user/secret', POSIX_ROOTS)).toBe(false);
  });

  it('rejects a symlink-style prefix that is not a true child of any root', () => {
    // /srv/media-evil is *not* the same as /srv/media; path.resolve /
    // path.relative must catch the prefix-spoofing attempt.
    expect(isPathWithinRoots('/srv/media-evil/secret', POSIX_ROOTS)).toBe(false);
  });

  it('rejects an empty candidate path', () => {
    expect(isPathWithinRoots('', POSIX_ROOTS)).toBe(false);
  });

  it('rejects a non-string candidate path', () => {
    expect(isPathWithinRoots(null as any, POSIX_ROOTS)).toBe(false);
    expect(isPathWithinRoots(undefined as any, POSIX_ROOTS)).toBe(false);
    expect(isPathWithinRoots(123 as any, POSIX_ROOTS)).toBe(false);
  });

  it('rejects when the root-folder list is empty', () => {
    expect(isPathWithinRoots('/srv/media/tv', [])).toBe(false);
  });

  it('rejects when the root-folder list is not an array', () => {
    expect(isPathWithinRoots('/srv/media/tv', null as any)).toBe(false);
    expect(isPathWithinRoots('/srv/media/tv', 'not-an-array' as any)).toBe(false);
  });

  it('skips empty / non-string entries in the root list rather than throwing', () => {
    expect(isPathWithinRoots('/srv/media/tv', ['', '/srv/media', null as any])).toBe(true);
  });
});

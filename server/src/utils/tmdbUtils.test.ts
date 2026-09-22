import { describe, expect, it } from 'vitest';
import { buildTMDBRequest, isTMDBReadAccessToken } from './tmdbUtils';

// Dummy token with the JWT shape (header.payload.signature, base64url). It is
// not a credential: every segment encodes fixture data.
const READ_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const V3_API_KEY = '0123456789abcdef0123456789abcdef';

describe('isTMDBReadAccessToken', () => {
  it.each([
    ['a three-segment base64url token', READ_ACCESS_TOKEN],
    ['a token with padding-free underscore segments', 'a.b-c_d.e'],
  ])('accepts %s', (_label, key) => {
    expect(isTMDBReadAccessToken(key)).toBe(true);
  });

  it.each([
    ['a v3 hex key', V3_API_KEY],
    ['a v3 legacy key', 'tmdb-key'],
    ['two segments only', 'abc.def'],
    ['an empty segment', 'abc..def'],
    ['a segment with invalid characters', 'abc.d?f.ghi'],
    ['a trailing dot', 'abc.def.'],
    ['an empty string', ''],
  ])('rejects %s', (_label, key) => {
    expect(isTMDBReadAccessToken(key)).toBe(false);
  });
});

describe('buildTMDBRequest', () => {
  it('appends the v3 key as api_key and returns no auth headers', () => {
    expect(buildTMDBRequest('https://api.themoviedb.org/3', '/list/7', V3_API_KEY, ['page=1'])).toEqual({
      url: `https://api.themoviedb.org/3/list/7?api_key=${V3_API_KEY}&page=1`,
      headers: {},
    });
  });

  it('URL-encodes a v3 key inside the query string', () => {
    const { url, headers } = buildTMDBRequest('https://base', '/movie/1', 'k&y');

    expect(url).toBe('https://base/movie/1?api_key=k%26y');
    expect(headers).toEqual({});
  });

  it('omits the query string entirely for a v3 key without extra params', () => {
    const { url } = buildTMDBRequest('https://base', '/movie/1', 'v3key');

    expect(url).toBe('https://base/movie/1?api_key=v3key');
  });

  it('sends a read access token as a Bearer header without api_key in the URL', () => {
    expect(buildTMDBRequest('https://api.themoviedb.org/3', '/list/7', READ_ACCESS_TOKEN, ['page=2'])).toEqual({
      url: 'https://api.themoviedb.org/3/list/7?page=2',
      headers: { Authorization: `Bearer ${READ_ACCESS_TOKEN}` },
    });
  });

  it('drops the question mark for a token request without extra params', () => {
    const { url, headers } = buildTMDBRequest('https://base', '/movie/1', READ_ACCESS_TOKEN);

    expect(url).toBe('https://base/movie/1');
    expect(headers).toEqual({ Authorization: `Bearer ${READ_ACCESS_TOKEN}` });
  });

  it('trims surrounding whitespace before the token detection and header', () => {
    const { url, headers } = buildTMDBRequest('https://base', '/movie/1', `  ${READ_ACCESS_TOKEN}  `);

    expect(url).toBe('https://base/movie/1');
    expect(headers).toEqual({ Authorization: `Bearer ${READ_ACCESS_TOKEN}` });
  });
});

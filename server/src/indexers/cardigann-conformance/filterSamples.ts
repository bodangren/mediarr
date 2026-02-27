export interface CanonicalFilterSample {
  input: string;
  args?: unknown[];
  expected: string;
}

export const canonicalFilterSamples: Record<string, CanonicalFilterSample> = {
  andmatch: { input: 'match', expected: 'match' },
  append: { input: 'name', args: ['-suffix'], expected: 'name-suffix' },
  dateparse: { input: '2026-01-01T10:00:00Z', expected: '2026-01-01T10:00:00.000Z' },
  fuzzytime: { input: '2 days ago', expected: '2026-01-13T12:00:00.000Z' },
  humanize: { input: '1.2 GB', expected: '1.2 GB' },
  prepend: { input: 'name', args: ['prefix-'], expected: 'prefix-name' },
  re_replace: { input: 'Show S2024', args: ['\\bS(20\\d{2})\\b', '$1'], expected: 'Show 2024' },
  regexp: { input: '/Ubuntu-24-04-LTS-torrent-123.html', args: ['/([^/]+?)-torrent-\\d+\\.html'], expected: 'Ubuntu-24-04-LTS' },
  regex: { input: '/Ubuntu-24-04-LTS-torrent-123.html', args: ['/([^/]+?)-torrent-\\d+\\.html'], expected: 'Ubuntu-24-04-LTS' },
  remove: { input: 'a b c', args: [' '], expected: 'abc' },
  replace: { input: 'A-B-C', args: ['-', ' '], expected: 'A B C' },
  split: { input: 'a/b/c', args: ['/', 1], expected: 'b' },
  timeago: { input: '2 days ago', expected: '2026-01-13T12:00:00.000Z' },
  tolower: { input: 'ABC', expected: 'abc' },
  trim: { input: '  abc  ', expected: 'abc' },
  urldecode: { input: 'Rick%20and%20Morty', expected: 'Rick and Morty' },
};

import { describe, expect, it } from 'vitest';
import {
  renderCardigannTemplate,
  type TemplateRuntimeContext,
} from '../TemplateRuntime';

const baseContext: TemplateRuntimeContext = {
  query: {
    q: 'The Last of Us',
    season: 1,
    ep: 2,
    imdbid: 'tt3581920',
    tmdbid: '100088',
  },
  config: {
    sort: 'time',
    'filter-id': 2,
    sitelink: 'https://example.test/',
  },
  categories: [5000, 5040],
};

describe('TemplateRuntime', () => {
  it('renders Query substitutions across search paths and fields', () => {
    const pathTemplate = '/search/{{ .Query.Keywords }}/s{{ .Query.Season }}e{{ .Query.Ep }}';
    const fieldTemplate = '{{ .Query.IMDBID }}::{{ .Query.TMDBID }}';

    const renderedPath = renderCardigannTemplate(pathTemplate, baseContext);
    const renderedField = renderCardigannTemplate(fieldTemplate, baseContext);

    expect(renderedPath).toBe('/search/The+Last+of+Us/s1e2');
    expect(renderedField).toBe('tt3581920::100088');
  });

  it('renders Config substitutions from indexer settings', () => {
    const template = '/browse/{{ .Config.sort }}/{{ .Config.filter-id }}';

    const rendered = renderCardigannTemplate(template, baseContext);

    expect(rendered).toBe('/browse/time/2');
  });

  it('renders category template values used by imported definitions', () => {
    const joinTemplate = 'q.php?q={{ .Query.Keywords }}&cat={{ join .Categories "," }}';
    const rangeTemplate = 'get-posts{{ range .Categories }}:category:{{.}}{{end }}';

    const renderedJoin = renderCardigannTemplate(joinTemplate, baseContext);
    const renderedRange = renderCardigannTemplate(rangeTemplate, baseContext);

    expect(renderedJoin).toBe('q.php?q=The+Last+of+Us&cat=5000,5040');
    expect(renderedRange).toBe('get-posts:category:5000:category:5040');
  });

  it('keeps URL encoding behavior for query values', () => {
    const template = '/api?q={{ .Query.Keywords }}';
    const encoded = renderCardigannTemplate(template, {
      ...baseContext,
      query: { ...baseContext.query, q: 'Rick & Morty: S01' },
    });

    expect(encoded).toBe('/api?q=Rick+%26+Morty%3A+S01');
  });

  it('evaluates if/else conditional branches used by definitions', () => {
    const keywordConditional = '{{ if .Keywords }}search/{{ .Keywords }}{{ else }}home{{ end }}';
    const andEqConditional =
      '{{ if and (.Keywords) (eq .Config.disablesort .False) }}sort-{{ else }}nosort-{{ end }}';

    const withKeywords = renderCardigannTemplate(keywordConditional, {
      ...baseContext,
      config: { ...baseContext.config, disablesort: false },
    });
    const withoutKeywords = renderCardigannTemplate(keywordConditional, {
      ...baseContext,
      query: { ...baseContext.query, q: '' },
      config: { ...baseContext.config, disablesort: false },
    });
    const andEqTrue = renderCardigannTemplate(andEqConditional, {
      ...baseContext,
      config: { ...baseContext.config, disablesort: false },
    });
    const andEqFalse = renderCardigannTemplate(andEqConditional, {
      ...baseContext,
      config: { ...baseContext.config, disablesort: true },
    });

    expect(withKeywords).toBe('search/The+Last+of+Us');
    expect(withoutKeywords).toBe('home');
    expect(andEqTrue).toBe('sort-');
    expect(andEqFalse).toBe('nosort-');
  });

  it('fails unresolved or unsupported template nodes with diagnostics in strict mode', () => {
    const unsupportedNode = '{{ if ne .Config.sort "time" }}a{{ else }}b{{ end }}';

    expect(() => renderCardigannTemplate(unsupportedNode, baseContext, { strict: true })).toThrow(
      /unsupported template node/i,
    );
    expect(() => renderCardigannTemplate('{{ .Unsupported.Value }}', baseContext, { strict: true })).toThrow(
      /unresolved template reference/i,
    );
  });
});

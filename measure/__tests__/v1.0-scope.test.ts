import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCOPE_PATH = resolve(__dirname, '..', 'v1.0-scope.md');

function readScopeOrThrow(): string {
  if (!existsSync(SCOPE_PATH)) {
    throw new Error(
      `measure/v1.0-scope.md does not exist yet (expected at ${SCOPE_PATH}). ` +
        'S1 deliverable is a hand-written scope checklist ratified by the maintainer. ' +
        'See measure/tracks/release_v1_cut_20260607/spec.md S1 acceptance criteria.',
    );
  }
  return readFileSync(SCOPE_PATH, 'utf8');
}

const FLAGGED_TRACK_IDS = [
  'feature_flutter_media_detail',
  'feature_scheduler_automation_dashboard',
] as const;

// Tighter positive markers — each requires an explicit direction/target word so the
// patterns do NOT match a bare "cut" or "deferred" appearing inside a negated phrase
// (e.g., "we have not cut this from the roadmap", "this is not deferred to post-v1.0",
// "not out-of-scope"). See the boundary tests at the bottom of this file for proof.
const CUT_PATTERNS: RegExp[] = [
  /\bcut\s+(?:to|from|in)\b/i,
  /\bdeferred\s+(?:to|until|per|for)\b/i,
  /\bpost[-\s]?v1\.0\b/i,
  /\bship[-\s]?in[-\s]?v1\.0\s*:\s*no\b/i,
  /\bout[-\s]?of[-\s]?scope\b/i,
];

// A positive match is treated as negated when a "not/no/never/n't" word ends the
// 10 chars immediately preceding the match. The 10-char window is tight enough to
// ignore a negation that targets a different clause (e.g., "not deferred, but cut
// to post-v1.0") and wide enough to catch direct negations of the matched verb
// (e.g., "we have not cut this", "this is not deferred to post-v1.0").
const NEGATION_PREFIX_RE = /\b(?:not|no|never|n't)\b[^.\n]{0,10}$/i;

function isFlaggedTrack(line: string): boolean {
  return FLAGGED_TRACK_IDS.some((id) => line.includes(id));
}

function firstMatchIndex(line: string, patterns: RegExp[]): number | null {
  let first: number | null = null;
  for (const re of patterns) {
    const m = re.exec(line);
    if (m && m.index !== undefined) {
      if (first === null || m.index < first) {
        first = m.index;
      }
    }
  }
  return first;
}

function isExplicitlyCut(line: string): boolean {
  if (isFlaggedTrack(line)) return true;
  const idx = firstMatchIndex(line, CUT_PATTERNS);
  if (idx === null) return false;
  const prefix = line.slice(0, idx);
  return !NEGATION_PREFIX_RE.test(prefix);
}

describe('measure/v1.0-scope.md — release_v1_cut_20260607 S1 contract', () => {
  it('exists at measure/v1.0-scope.md (S1 deliverable is the file itself)', () => {
    expect(
      existsSync(SCOPE_PATH),
      'measure/v1.0-scope.md must exist before S1 can be marked complete',
    ).toBe(true);
  });

  it('declares a top-level Capabilities section', () => {
    const content = readScopeOrThrow();
    expect(
      /^##\s+Capabilities\s*$/m.test(content),
      'v1.0-scope.md must contain a `## Capabilities` heading listing must-ship server domains, SPA workflows, and Flutter client screens',
    ).toBe(true);
  });

  it('marks every capability with a met ([x]) or unmet ([ ]) checkbox', () => {
    const content = readScopeOrThrow();
    const checkboxLines = content.split('\n').filter((line) => /^\s*-\s*\[[ x]\]\s+/.test(line));
    expect(
      checkboxLines.length,
      'v1.0-scope.md must list at least one capability checkbox; got 0',
    ).toBeGreaterThan(0);
    // Each checkbox must be either [x] (met) or [ ] (unmet) — no other markers.
    for (const line of checkboxLines) {
      expect(
        /^\s*-\s*\[[ x]\]\s+\S/.test(line),
        `Checkbox line must be of the form "- [x] ..." or "- [ ] ..." — saw: ${JSON.stringify(line)}`,
      ).toBe(true);
    }
  });

  it('every unmet ([ ]) capability either maps to a flagged in-flight track OR is explicitly cut to post-v1.0', () => {
    const content = readScopeOrThrow();
    const unmetLines = content
      .split('\n')
      .filter((line) => /^\s*-\s*\[\s\]\s+/.test(line));
    expect(
      unmetLines.length,
      'S1 contract requires the scope doc to enumerate unmet capabilities (the only valid ones are the two in-flight feature tracks or explicit cuts); got 0 — re-check whether all capabilities are actually met at HEAD',
    ).toBeGreaterThan(0);
    for (const line of unmetLines) {
      const isFlagged = isFlaggedTrack(line);
      const isCut = isExplicitlyCut(line);
      expect(
        isFlagged || isCut,
        `Unmet capability must reference one of ${FLAGGED_TRACK_IDS.join(', ')} (the in-flight feature tracks) or be explicitly cut/post-v1.0. Saw: ${JSON.stringify(line)}`,
      ).toBe(true);
    }
  });

  it('contains a maintainer sign-off line (live gate lives in the plan checkbox commit message — see test-strategy §5)', () => {
    const content = readScopeOrThrow();
    const hasSignOffLine =
      /sign[-\s]?off/i.test(content) || /\bsigned\b/i.test(content) || /\bsignature\b/i.test(content);
    expect(
      hasSignOffLine,
      'v1.0-scope.md must contain a sign-off / signed / signature line so the maintainer ratification is durable in the artifact, not only in the commit message',
    ).toBe(true);
  });

  it('declares all three capability category headings (Server, SPA, Flutter) under ## Capabilities', () => {
    const content = readScopeOrThrow();
    const expectedHeadings = [
      /^###\s+Server\s+Domains/im,
      /^###\s+SPA\s+Workflows/im,
      /^###\s+Flutter\s+Client\s+Screens/im,
    ];
    for (const re of expectedHeadings) {
      expect(
        re.test(content),
        `v1.0-scope.md must declare the h3 heading ${re.source} under ## Capabilities — the spec requires server domains, SPA workflows, and Flutter client screens to be enumerated as separate categories`,
      ).toBe(true);
    }
  });

  it('declares a "## Deferred to Post-v1.0" section enumerating conscious cuts', () => {
    const content = readScopeOrThrow();
    expect(
      /^##\s+Deferred\s+to\s+Post[-\s]?v1\.0\s*$/im.test(content),
      'v1.0-scope.md must declare a `## Deferred to Post-v1.0` section so conscious cuts (as distinct from the in-flight Capabilities section) are auditable',
    ).toBe(true);
  });

  it('maintainer sign-off is a POSITIVE ratification (markdown bold `**Sign-off:**` or equivalent), not a negated "not signed" line', () => {
    const content = readScopeOrThrow();
    // The broad test above would still pass on a line like "this contract was not signed".
    // This stricter check requires a positive sign-off marker as a markdown emphasis.
    const hasPositiveSignOff =
      /\*\*Sign[-\s]?off:\*\*|\*\*Signed\s+(?:by|off):\*\*|\*\*Approved\s+by:\*\*|\*\*Ratified\s+by:\*\*/i.test(content);
    expect(
      hasPositiveSignOff,
      'v1.0-scope.md must contain a positive maintainer sign-off (e.g., `**Sign-off:**`, `**Signed by:**`, `**Approved by:**`) so the ratification is durable in the artifact, not just the word "sign" inside a comment or negation',
    ).toBe(true);
  });

  it('maintainer sign-off line includes a YYYY-MM-DD date (ratification is dated)', () => {
    const content = readScopeOrThrow();
    const signOffLineMatch =
      /(\*\*Sign[-\s]?off:\*\*[^*\n]+|\*\*Signed\s+(?:by|off):\*\*[^*\n]+|\*\*Approved\s+by:\*\*[^*\n]+|\*\*Ratified\s+by:\*\*[^*\n]+)/i.exec(
        content,
      );
    expect(
      signOffLineMatch !== null,
      'v1.0-scope.md must contain a **Sign-off:** / **Signed by:** / **Approved by:** / **Ratified by:** line to anchor this test',
    ).toBe(true);
    if (signOffLineMatch) {
      expect(
        /\b20\d{2}-\d{2}-\d{2}\b/.test(signOffLineMatch[1]),
        `Sign-off line must include a YYYY-MM-DD date so the ratification is unambiguously dated — saw: ${JSON.stringify(signOffLineMatch[1])}`,
      ).toBe(true);
    }
  });
});

describe('isExplicitlyCut helper — boundary cases (release_v1_cut_20260607 S1)', () => {
  // These tests directly exercise the helper logic. They prove the tightened regex
  // eliminates the false-positive class documented in the v1 review-c notes: the
  // previous patterns matched the bare word "cut" / "deferred" / "out-of-scope"
  // inside a negated phrase, so a v1.0-scope.md line like "we have not cut this
  // from the roadmap" would have passed test 4 even though the capability is NOT
  // explicitly cut. The current patterns require a positive marker (cut to/from,
  // deferred to/per, post-v1.0, ship-in-v1.0: no, out-of-scope) and reject the
  // pattern when a "not/no/never" ends the 10-char prefix.

  it('accepts a "cut to post-v1.0" line (positive cut marker)', () => {
    expect(
      isExplicitlyCut('[ ] Foo — cut to post-v1.0; deferred per 2026-06-07 scope review'),
    ).toBe(true);
  });

  it('accepts a "deferred per <date>" line (positive deferred marker)', () => {
    expect(isExplicitlyCut('[ ] Foo — deferred per 2026-06-07 scope review')).toBe(true);
  });

  it('accepts an "in-flight: feature_X" line via the flagged-track check', () => {
    expect(
      isExplicitlyCut(
        '[ ] Foo — description (in-flight: feature_scheduler_automation_dashboard)',
      ),
    ).toBe(true);
  });

  it('accepts an "out-of-scope per design" line (positive out-of-scope marker)', () => {
    expect(isExplicitlyCut('[ ] Foo — out-of-scope per current design')).toBe(true);
  });

  it('accepts a "ship-in-v1.0: no" line (explicit negative answer)', () => {
    expect(isExplicitlyCut('[ ] Foo — ship-in-v1.0: no (deferred because blocked)')).toBe(true);
  });

  it('REJECTS a "we have not cut this" line (negated cut — was a v1 false positive)', () => {
    expect(
      isExplicitlyCut('[ ] Foo — we have not cut this from the roadmap'),
    ).toBe(false);
  });

  it('REJECTS a "this is not deferred to post-v1.0" line (negated deferred — was a v1 false positive)', () => {
    expect(isExplicitlyCut('[ ] Foo — this is not deferred to post-v1.0')).toBe(false);
  });

  it('REJECTS a "not out-of-scope" line (negated out-of-scope — was a v1 false positive)', () => {
    expect(isExplicitlyCut('[ ] Foo — not out-of-scope (this is in scope for v1.0)')).toBe(false);
  });

  it('REJECTS a "not deferred (will ship in v1.0)" line (negated deferred — was a v1 false positive)', () => {
    expect(isExplicitlyCut('[ ] Foo — not deferred (will ship in v1.0)')).toBe(false);
  });

  it('REJECTS a "ship-in-v1.0: yes" line (positive answer — not a cut)', () => {
    expect(isExplicitlyCut('[ ] Foo — ship-in-v1.0: yes, on the roadmap')).toBe(false);
  });

  it('REJECTS a placeholder line with no decision marker', () => {
    expect(isExplicitlyCut('[ ] Foo — placeholder, no decision yet')).toBe(false);
  });

  it('isFlaggedTrack recognises both in-flight feature track ids', () => {
    expect(isFlaggedTrack('[ ] X — (in-flight: feature_flutter_media_detail)')).toBe(true);
    expect(isFlaggedTrack('[ ] X — (in-flight: feature_scheduler_automation_dashboard)')).toBe(
      true,
    );
    expect(isFlaggedTrack('[ ] X — unrelated track reference')).toBe(false);
  });
});

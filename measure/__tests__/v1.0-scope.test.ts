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

const CUT_PATTERNS: RegExp[] = [
  /\bcut\b/i,
  /\bpost[-\s]?v1\.0\b/i,
  /\bdeferred\b/i,
  /\bout[-\s]?of[-\s]?scope\b/i,
  /\bship[-\s]?in[-\s]?v1\.0\s*:\s*no\b/i,
];

function isFlaggedTrack(line: string): boolean {
  return FLAGGED_TRACK_IDS.some((id) => line.includes(id));
}

function isExplicitlyCut(line: string): boolean {
  return CUT_PATTERNS.some((re) => re.test(line));
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
});

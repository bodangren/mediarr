import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TRACKS_PATH = resolve(__dirname, '..', 'tracks.md');
const LESSONS_PATH = resolve(__dirname, '..', 'lessons-learned.md');
const ARCHIVE_DIR = resolve(__dirname, '..', 'archive', 'release_v1_cut_20260607');

function readTracks(): string {
  return readFileSync(TRACKS_PATH, 'utf8');
}

function readLessons(): string {
  return readFileSync(LESSONS_PATH, 'utf8');
}

function sectionBody(text: string, headingRegex: RegExp): string | null {
  // Extract the body of a section delimited by a top-level `## ` heading. Returns
  // null when the heading is absent so the calling test can fail with a clear
  // message that points at the missing anchor (rather than a vague match error).
  const lines = text.split('\n');
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRegex.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx === -1) return null;
  const body: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n');
}

describe('measure/tracks.md — release_v1_cut_20260607 S4 contract', () => {
  it('declares a top-level `## Post-v1.0 / Deferred` section', () => {
    const content = readTracks();
    expect(
      /^##\s+Post-v1\.0\s*\/\s*Deferred\s*$/m.test(content),
      'tracks.md must declare a `## Post-v1.0 / Deferred` section per test-strategy §1 S4 row and spec.md S4 AC',
    ).toBe(true);
  });

  it('enumerates every consciously-deferred track from the v1.0-scope "Deferred to Post-v1.0" list', () => {
    // Spec AC: "Given the deferred tracks (import-list UI tests, frontend+MSW
    // coverage, the deferred half of untested-server-services, indexer health
    // monitoring if not in v1.0) — Then a 'Post-v1.0 / Deferred' section lists
    // each with a one-line rationale". Each deferred track id (or its clearly
    // recognisable substring) must appear under the section header.
    const tracksContent = readTracks();
    const body = sectionBody(tracksContent, /^##\s+Post-v1\.0\s*\/\s*Deferred\s*$/m);
    expect(body, 'Post-v1.0 / Deferred section must exist before this contract applies').not.toBeNull();

    const REQUIRED_DEFERRED_IDS = [
      'chore_import_list_ui_tests_20260526',
      'chore_frontend_component_test_gaps_20260526',
      'indexer_health_monitoring_20260509',
    ] as const;
    // The "deferred half of untested-server-services" is captured by the named
    // entry on line 31 of tracks.md, which references the parent track id and
    // enumerates the 6 split-out services. Asserting the parent id plus the
    // "deferred remainder" marker covers both shapes.
    const REQUIRED_DEFERRED_PHRASES = [
      'chore_untested_server_services_20260526',
      'deferred remainder',
    ] as const;

    for (const id of REQUIRED_DEFERRED_IDS) {
      expect(
        body!.includes(id),
        `Post-v1.0 / Deferred section must enumerate the consciously-deferred track id ${id} (per spec.md S4 AC)`,
      ).toBe(true);
    }
    for (const phrase of REQUIRED_DEFERRED_PHRASES) {
      expect(
        body!.includes(phrase),
        `Post-v1.0 / Deferred section must reference the deferred-half-of-untested-server-services via phrase ${JSON.stringify(phrase)}`,
      ).toBe(true);
    }
  });

  it('each listed item has a non-empty one-line rationale (title + descriptive prose, not just a link)', () => {
    const tracksContent = readTracks();
    const body = sectionBody(tracksContent, /^##\s+Post-v1\.0\s*\/\s*Deferred\s*$/m);
    expect(body, 'Post-v1.0 / Deferred section must exist before this contract applies').not.toBeNull();

    // Each track entry under the section follows the pattern
    // `- [x| ] **Track: <name>** ... — <rationale>`. We require at least one
    // dash-separated rationale segment after the title/link for each [ ] entry
    // so the section is auditable (per test-strategy §1 S4 row: "each with a
    // one-line rationale"). The [x] entries are archived so they may be exempt.
    const itemLines = body!
      .split('\n')
      .filter((line) => /^\s*-\s*\[.\]\s+\*\*Track:/.test(line) || /^\s*-\s*\[.\]\s+\*\*Server Service Test Coverage/.test(line));
    expect(itemLines.length, 'Post-v1.0 / Deferred section must list at least one track item').toBeGreaterThan(0);

    for (const line of itemLines) {
      // The em-dash separates the link/title from the rationale. Each entry
      // must contain at least one em-dash followed by non-whitespace prose.
      const dashIdx = line.indexOf(' — ');
      expect(
        dashIdx >= 0 && line.slice(dashIdx + 3).trim().length > 0,
        `Each Post-v1.0 / Deferred entry must include a one-line rationale after the title/link (em-dash separator). Saw: ${JSON.stringify(line)}`,
      ).toBe(true);
    }
  });
});

describe('measure/lessons-learned.md — release_v1_cut_20260607 S4 retrospective contract', () => {
  it('contains a release-cut retrospective entry attributed to release_v1_cut_20260607', () => {
    const content = readLessons();
    // Per plan.md task 2: "Update lessons-learned.md with the release-cut
    // retrospective (what the open-ended testing tail cost; the value-first
    // reordering)". The retrospective must be:
    //   (a) attributed to release_v1_cut_20260607 (track id in the date
    //       prefix so future readers can audit git history);
    //   (b) titled with one of the prescribed retrospective markers so the
    //       section is greppable from CI / supervisor audits;
    //   (c) dated YYYY-MM-DD.
    const hasAttribution = /\(20\d{2}-\d{2}-\d{2},?\s+release_v1_cut_20260607\)/i.test(content);
    expect(
      hasAttribution,
      'lessons-learned.md must contain at least one entry attributed to release_v1_cut_20260607 with a YYYY-MM-DD date prefix',
    ).toBe(true);

    const hasRetrospectiveTitle = /\*\*[^*]*(release[-\s]?cut\s+retrospective|release\s+v1\.0\s+retrospective|retrospective[^*]*release)[^*]*\*\*/i.test(content);
    expect(
      hasRetrospectiveTitle,
      'lessons-learned.md must contain a `**Release-Cut Retrospective:**` (or equivalent) titled entry so the section is greppable',
    ).toBe(true);
  });

  it('retrospective documents the open-ended testing tail cost', () => {
    // plan.md task 2 explicit requirement #1: "what the open-ended testing tail
    // cost". The retrospective must reference the testing tail and its cost
    // (time, churn, or similar) so future planning can reason about it.
    const content = readLessons();
    const hasTestingTail =
      /testing\s+tail/i.test(content) || /open[-\s]?ended\s+testing/i.test(content);
    const hasCostMarker =
      /\bcost\b|\bchurn\b|\bdelay\b|\bslowed\b|\btime\s+(?:spent|lost|invested)\b|\bdays?\b|\bweeks?\b/i.test(content);
    expect(hasTestingTail, 'retrospective must reference the "testing tail" or "open-ended testing" pattern').toBe(true);
    expect(
      hasCostMarker,
      'retrospective must quantify or characterise the cost of the open-ended testing tail',
    ).toBe(true);
  });

  it('retrospective documents the value-first reordering', () => {
    // plan.md task 2 explicit requirement #2: "the value-first reordering".
    // The retrospective must reference the value-first ordering principle
    // (shipping user-facing capability before exhaustive coverage / cleanup)
    // so future cuts follow the same heuristic.
    const content = readLessons();
    const hasValueFirst =
      /value[-\s]?first/i.test(content) ||
      /\bship[-\s]?value[-\s]?first\b/i.test(content) ||
      /value\s+over\s+coverage/i.test(content);
    expect(
      hasValueFirst,
      'retrospective must reference the value-first reordering (ship user-facing capability before exhaustive coverage / cleanup)',
    ).toBe(true);
  });
});

describe('measure/archive/release_v1_cut_20260607 — release_v1_cut_20260607 S4 archival contract', () => {
  it('track folder has been moved to measure/archive/ (AGENTS.md §7 archival rule)', () => {
    // Per AGENTS.md §7: "When a plan is 100% complete, archive the track folder
    // to measure/archive/ and update tracks.md. Do not ask for permission." The
    // S4 closeout step requires the folder to be in measure/archive/, not
    // measure/tracks/. Live gate = directory exists at the archive path.
    expect(
      existsSync(ARCHIVE_DIR),
      `measure/archive/release_v1_cut_20260607 must exist (track folder archived per AGENTS.md §7). Saw existsSync = ${existsSync(ARCHIVE_DIR)}`,
    ).toBe(true);
  });
});

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTrack9ArtifactPath } from './helpers/track9Paths';

type SurfaceFinding = {
  route: string;
  status: 'fully_functional' | 'partially_functional' | 'scaffold_only' | 'placeholder';
  placeholderSignals: string[];
  missingInteractions: string[];
  backendCapabilityLinks: string[];
};

type FrontendParityReport = {
  surfaces: SurfaceFinding[];
};

const frontendParityPath = resolveTrack9ArtifactPath('frontend-parity-report.json');

function readReport(): FrontendParityReport {
  return JSON.parse(fs.readFileSync(frontendParityPath, 'utf8')) as FrontendParityReport;
}

function findSurface(report: FrontendParityReport, route: string): SurfaceFinding {
  const surface = report.surfaces.find(entry => entry.route === route);
  expect(surface, `Missing frontend surface ${route}`).toBeDefined();
  return surface!;
}

describe('Track 9 Phase 3 Frontend Audit (Gemini)', () => {
  it('AUDIT: Subtitles surface is placeholder-level in the parity report', () => {
    const report = readReport();
    const subtitles = findSurface(report, '/subtitles');

    expect(subtitles.status).toBe('placeholder');
    expect(subtitles.placeholderSignals.length).toBeGreaterThan(0);
    expect(subtitles.missingInteractions).toEqual(
      expect.arrayContaining(['manual subtitle search and download operations']),
    );
  });

  it('AUDIT: Queue surface is scaffold-only with Track 7D follow-up gaps', () => {
    const report = readReport();
    const queue = findSurface(report, '/queue');

    expect(queue.status).toBe('scaffold_only');
    expect(queue.placeholderSignals).toEqual(
      expect.arrayContaining([expect.stringContaining('Track 7D')]),
    );
    expect(queue.missingInteractions).toEqual(
      expect.arrayContaining(['pause/resume/remove queue controls']),
    );
  });

  it('AUDIT: Settings surface is scaffold-only in Track 7E snapshot', () => {
    const report = readReport();
    const settings = findSurface(report, '/settings');

    expect(settings.status).toBe('scaffold_only');
    expect(settings.placeholderSignals).toEqual(
      expect.arrayContaining([expect.stringContaining('Track 7E')]),
    );
  });

  it('AUDIT: Dashboard remains partial in the audit snapshot', () => {
    const report = readReport();
    const dashboard = findSurface(report, '/');

    expect(dashboard.status).toBe('partially_functional');
    expect(dashboard.missingInteractions.length).toBeGreaterThan(0);
  });

  it('AUDIT: Indexers report contains known contract-shape interaction gaps', () => {
    const report = readReport();
    const indexers = findSurface(report, '/indexers');

    expect(indexers.status).toBe('partially_functional');
    expect(indexers.missingInteractions).toEqual(
      expect.arrayContaining(['definition-driven dynamic config contract fields']),
    );
  });
});

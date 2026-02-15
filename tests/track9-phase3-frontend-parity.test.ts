import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTrack9ArtifactPath } from './helpers/track9Paths';

type FrontendSurfaceStatus = 'fully_functional' | 'partially_functional' | 'scaffold_only' | 'placeholder';

type FrontendSurfaceFinding = {
  route: string;
  surface: string;
  status: FrontendSurfaceStatus;
  placeholderSignals: string[];
  missingInteractions: string[];
  backendCapabilityLinks: string[];
  severity: 'P0' | 'P1' | 'P2' | 'P3';
};

type FrontendParityReport = {
  generatedAt: string;
  surfaces: FrontendSurfaceFinding[];
};

const reportPath = resolveTrack9ArtifactPath('frontend-parity-report.json');

function readReport(): FrontendParityReport {
  return JSON.parse(fs.readFileSync(reportPath, 'utf8')) as FrontendParityReport;
}

function findSurface(report: FrontendParityReport, route: string): FrontendSurfaceFinding {
  const entry = report.surfaces.find(surface => surface.route === route);
  expect(entry, `Missing surface report for ${route}`).toBeDefined();
  return entry!;
}

describe('Track 9 Phase 3 frontend parity checks', () => {
  it('captures placeholder/scaffold signals for critical surfaces', () => {
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = readReport();

    const queue = findSurface(report, '/queue');
    const subtitles = findSurface(report, '/subtitles');

    expect(queue.placeholderSignals.length).toBeGreaterThan(0);
    expect(subtitles.placeholderSignals.length).toBeGreaterThan(0);
  });

  it('captures clone-critical missing interaction gaps', () => {
    const report = readReport();

    const indexers = findSurface(report, '/indexers');
    const queue = findSurface(report, '/queue');
    const subtitles = findSurface(report, '/subtitles');

    expect(indexers.missingInteractions).toEqual(
      expect.arrayContaining(['definition-driven dynamic config contract fields']),
    );
    expect(queue.missingInteractions).toEqual(
      expect.arrayContaining(['pause/resume/remove queue controls']),
    );
    expect(subtitles.missingInteractions).toEqual(
      expect.arrayContaining(['manual subtitle search and download operations']),
    );
  });

  it('captures dashboard/activity/settings parity requirements from Track 7E', () => {
    const report = readReport();

    const dashboard = findSurface(report, '/');
    const activity = findSurface(report, '/activity');
    const settings = findSurface(report, '/settings');

    expect(dashboard.backendCapabilityLinks.length).toBeGreaterThan(0);
    expect(activity.backendCapabilityLinks.length).toBeGreaterThan(0);
    expect(settings.backendCapabilityLinks.length).toBeGreaterThan(0);

    expect(dashboard.status).not.toBe('fully_functional');
    expect(activity.status).not.toBe('fully_functional');
    expect(settings.status).not.toBe('fully_functional');
  });
});

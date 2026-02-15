import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTrack9ArtifactPath } from './helpers/track9Paths';

type ProbeStatus = 'pass' | 'fail' | 'partial';

type BackendProbe = {
  probeId: string;
  title: string;
  status: ProbeStatus;
  runtime: {
    mode: string;
    command: string;
    observedOutput: string;
  };
  evidence: {
    routes: string[];
    files: string[];
  };
};

type BackendProbeReport = {
  generatedAt: string;
  probes: BackendProbe[];
};

const backendProbePath = resolveTrack9ArtifactPath('backend-probe-report.json');

function readReport(): BackendProbeReport {
  return JSON.parse(fs.readFileSync(backendProbePath, 'utf8')) as BackendProbeReport;
}

function findProbe(report: BackendProbeReport, probeId: string): BackendProbe {
  const probe = report.probes.find(item => item.probeId === probeId);
  expect(probe, `Missing probe: ${probeId}`).toBeDefined();
  return probe!;
}

describe('Track 9 Phase 2 backend parity probes', () => {
  it('records indexer management contract realism probes', () => {
    expect(fs.existsSync(backendProbePath)).toBe(true);
    const report = readReport();
    const probe = findProbe(report, 'indexer-management-contract');

    expect(probe.runtime.mode).toBe('live_api_runtime');
    expect(probe.evidence.routes).toEqual(
      expect.arrayContaining(['/api/indexers', '/api/indexers/:id', '/api/indexers/:id/test']),
    );
  });

  it('records metadata search probes for tv/movie and api key behavior', () => {
    const report = readReport();

    const tvProbe = findProbe(report, 'metadata-search-tv');
    const movieMissingKeyProbe = findProbe(report, 'metadata-search-movie-missing-key');
    const movieConfiguredKeyProbe = findProbe(report, 'metadata-search-movie-configured-key');

    expect(tvProbe.runtime.command.length).toBeGreaterThan(0);
    expect(movieMissingKeyProbe.runtime.command.length).toBeGreaterThan(0);
    expect(movieConfiguredKeyProbe.runtime.command.length).toBeGreaterThan(0);
  });

  it('records release grab side effects and subtitle variant contract probes', () => {
    const report = readReport();

    const releaseProbe = findProbe(report, 'release-grab-queue-activity');
    const subtitleProbe = findProbe(report, 'subtitle-variant-contract-scoping');

    expect(releaseProbe.evidence.routes).toEqual(
      expect.arrayContaining(['/api/releases/search', '/api/releases/grab', '/api/activity']),
    );
    expect(subtitleProbe.evidence.routes).toEqual(
      expect.arrayContaining(['/api/subtitles/search', '/api/subtitles/download']),
    );
  });
});

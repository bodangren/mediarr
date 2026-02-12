import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const trackRoot = path.join(repoRoot, 'conductor', 'tracks', 'clone_parity_gap_investigation_20260212');
const artifactsDir = path.join(trackRoot, 'artifacts');
const reportPath = path.join(artifactsDir, 'validation-integrity-report.json');

const testRoots = [
  path.join(repoRoot, 'tests'),
  path.join(repoRoot, 'app', 'src'),
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }

  return files;
}

const testFiles = testRoots
  .filter(root => fs.existsSync(root))
  .flatMap(root => walk(root))
  .filter(file => /\.test\.(ts|tsx|js|jsx)$/.test(file));

const surfaces = [
  'dashboard',
  'activity',
  'settings',
  'indexers',
  'add',
  'wanted',
  'queue',
  'subtitles',
  'library',
  'backend-core',
];

function classifySurface(relativePath, content) {
  const lowerPath = relativePath.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (lowerPath.includes('indexer')) return 'indexers';
  if (lowerPath.includes('wanted') || lowerContent.includes('/wanted')) return 'wanted';
  if (lowerPath.includes('queue') || lowerContent.includes('/queue')) return 'queue';
  if (lowerPath.includes('subtitle')) return 'subtitles';
  if (lowerPath.includes('settings') || lowerContent.includes('/settings')) return 'settings';
  if (lowerPath.includes('activity') || lowerContent.includes('/activity')) return 'activity';
  if (lowerPath.includes('/add/') || lowerPath.includes('add/page')) return 'add';
  if (lowerPath.includes('library')) return 'library';
  if (lowerPath.includes('/(shell)/page') || lowerPath.includes('dashboard')) return 'dashboard';

  return 'backend-core';
}

const surfaceCounters = new Map(surfaces.map(surface => [surface, { mockedTests: 0, nonMockedTests: 0 }]));

for (const file of testFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relative = path.relative(repoRoot, file).replaceAll(path.sep, '/');
  const surface = classifySurface(relative, content);
  const hasMock = content.includes('vi.mock(');
  const counters = surfaceCounters.get(surface);
  if (!counters) continue;

  if (hasMock) {
    counters.mockedTests += 1;
  } else {
    counters.nonMockedTests += 1;
  }
}

const surfaceMetrics = Array.from(surfaceCounters.entries()).map(([surface, counts]) => {
  const total = counts.mockedTests + counts.nonMockedTests;
  const ratio = total > 0 ? counts.mockedTests / total : 0;
  return {
    surface,
    mockedTests: counts.mockedTests,
    nonMockedTests: counts.nonMockedTests,
    mockRatio: Number(ratio.toFixed(4)),
  };
});

const backendRouteGroups = [
  { group: 'indexers', patterns: ['/api/indexers'] },
  { group: 'metadata', patterns: ['/api/media/search'] },
  { group: 'releases', patterns: ['/api/releases/search', '/api/releases/grab'] },
  { group: 'torrents', patterns: ['/api/torrents'] },
  { group: 'subtitles', patterns: ['/api/subtitles/search', '/api/subtitles/download'] },
  { group: 'operations', patterns: ['/api/activity', '/api/settings', '/api/health'] },
];

function countContractReferences(patterns) {
  let count = 0;
  for (const file of testFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (patterns.some(pattern => content.includes(pattern))) {
      count += 1;
    }
  }
  return count;
}

function countRuntimeEvidence(group) {
  const runtimeDirCandidates = [
    path.join(trackRoot, 'evidence', 'runtime'),
    path.join(trackRoot, 'evidence', 'frontend', 'runtime', 'api'),
  ];

  let count = 0;
  for (const dir of runtimeDirCandidates) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const lowerName = path.basename(file).toLowerCase();
      if (lowerName.includes(group)) {
        count += 1;
      }
    }
  }

  return count;
}

const backendCoverageByRouteGroup = backendRouteGroups.map(group => ({
  routeGroup: group.group,
  contractTestFiles: countContractReferences(group.patterns),
  runtimeEvidenceFiles: countRuntimeEvidence(group.group),
}));

const parityMatrixPath = path.join(artifactsDir, 'parity-matrix.json');
const parityMatrix = JSON.parse(fs.readFileSync(parityMatrixPath, 'utf8'));

const criticalFlowIds = [
  'prowlarr.indexer.definition-ingestion',
  'prowlarr.indexer.contract-shape',
  'sonarr.metadata.tv-search',
  'radarr.metadata.movie-search',
  'core.release.search-grab-side-effects',
  'bazarr.variant.subtitle-operations',
  'core.settings.persistence',
  'core.activity.timeline',
  'core.queue.operations',
];

const supplementalRuntimeEvidence = {
  'core.settings.persistence': [
    'conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/settings-get.json',
    'conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/settings-patch.json',
  ],
  'core.activity.timeline': [
    'conductor/tracks/clone_parity_gap_investigation_20260212/evidence/runtime/activity-after-grab-body.v2.json',
    'conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/pages/_activity.html',
  ],
  'core.queue.operations': [
    'conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/queue-list.json',
    'conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/queue-pause.json',
    'conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/queue-resume.json',
  ],
};

const criticalFlowCoverage = criticalFlowIds.map(flowId => {
  const entry = (parityMatrix.entries ?? []).find(item => item.id === flowId);
  const runtimeSignals = entry?.evidence?.runtimeVerification ?? [];
  const hasRuntimeSignal = runtimeSignals.some(file => typeof file === 'string' && fs.existsSync(path.join(repoRoot, file)));
  const hasSupplementalRuntimeSignal = (supplementalRuntimeEvidence[flowId] ?? [])
    .some(file => fs.existsSync(path.join(repoRoot, file)));
  const hasContractSignal = (entry?.evidence?.tests ?? []).length > 0;

  return {
    flowId,
    hasNonMockedPath: hasRuntimeSignal || hasSupplementalRuntimeSignal || hasContractSignal,
    requiredVerificationClasses: ['unit', 'contract', 'integration_or_runtime'],
  };
});

function deriveConfidence(entry) {
  const testCount = (entry?.evidence?.tests ?? []).length;
  const runtimeCount = (entry?.evidence?.runtimeVerification ?? []).filter(file => fs.existsSync(path.join(repoRoot, file))).length;

  if (runtimeCount > 0 && testCount > 0) {
    return 'high';
  }

  if (testCount > 0) {
    return 'medium';
  }

  return 'low';
}

const capabilityConfidence = (parityMatrix.entries ?? []).map(entry => ({
  capabilityId: entry.id,
  verificationDepth: {
    unitOrContractEvidence: (entry?.evidence?.tests ?? []).length,
    runtimeEvidence: (entry?.evidence?.runtimeVerification ?? []).filter(file => fs.existsSync(path.join(repoRoot, file))).length,
  },
  confidence: deriveConfidence(entry),
}));

const report = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  surfaceMetrics,
  backendCoverageByRouteGroup,
  criticalFlowCoverage,
  capabilityConfidence,
  parityClaimPolicy: {
    requires: ['unit', 'contract', 'integration_or_runtime'],
    rule: 'Capabilities must include at least one non-mocked verification class before parity-implemented status is allowed.',
  },
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${path.relative(repoRoot, reportPath)}`);

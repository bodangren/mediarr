import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const TRACK_ROOT = path.join(
  process.cwd(),
  'conductor',
  'tracks',
  'clone_parity_gap_investigation_20260212',
  'artifacts',
);

const PARITY_MATRIX_PATH = path.join(TRACK_ROOT, 'gemini-parity-matrix.json');
const CAPABILITY_BASELINE_PATH = path.join(TRACK_ROOT, 'gemini-capability-baseline.json');
const SEVERITY_RUBRIC_PATH = path.join(TRACK_ROOT, 'gemini-severity-rubric.json');

describe('Track 9 Phase 1 (Gemini) - Schema Validation', () => {
  it('validates gemini-parity-matrix.json schema', () => {
    expect(fs.existsSync(PARITY_MATRIX_PATH)).toBe(true);
    const content = fs.readFileSync(PARITY_MATRIX_PATH, 'utf8');
    const matrix = JSON.parse(content);

    expect(matrix.version).toContain('gemini');
    expect(matrix.statusClasses).toEqual(
      expect.arrayContaining([
        'PARITY_IMPLEMENTED',
        'PARTIAL_IMPLEMENTATION',
        'SCAFFOLDED_ONLY',
        'PLACEHOLDER_ONLY',
        'MISSING',
        'REGRESSION',
      ]),
    );
    expect(Array.isArray(matrix.entries)).toBe(true);
    // Entries will be populated in later phases
  });

  it('validates gemini-capability-baseline.json schema', () => {
    expect(fs.existsSync(CAPABILITY_BASELINE_PATH)).toBe(true);
    const content = fs.readFileSync(CAPABILITY_BASELINE_PATH, 'utf8');
    const baseline = JSON.parse(content);

    expect(baseline.track).toBe('clone_parity_gap_investigation_20260212');
    expect(Array.isArray(baseline.capabilities)).toBe(true);
    expect(baseline.capabilities.length).toBeGreaterThan(0);

    for (const cap of baseline.capabilities) {
      expect(cap.id).toBeTypeOf('string');
      expect(cap.domain).toBeTypeOf('string');
      expect(cap.capability).toBeTypeOf('string');
      expect(cap.expectedSourceBehavior).toBeTypeOf('string');
      expect(cap.mediarrSurface.backend).toBeInstanceOf(Array);
      expect(cap.mediarrSurface.frontend).toBeInstanceOf(Array);
      expect(cap.investigationOwner).toBe('gemini-agent');
    }
  });

  it('validates gemini-severity-rubric.json schema', () => {
    expect(fs.existsSync(SEVERITY_RUBRIC_PATH)).toBe(true);
    const content = fs.readFileSync(SEVERITY_RUBRIC_PATH, 'utf8');
    const rubric = JSON.parse(content);

    expect(rubric.version).toContain('gemini');
    expect(rubric.scale).toHaveProperty('P0');
    expect(rubric.scale).toHaveProperty('P1');
    expect(rubric.scale).toHaveProperty('P2');
    expect(rubric.scale).toHaveProperty('P3');
    
    expect(rubric.scale.P0.definition).toBeTypeOf('string');
    expect(rubric.scale.P0.examples).toBeInstanceOf(Array);
  });
});

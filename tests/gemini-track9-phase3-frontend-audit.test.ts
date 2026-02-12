import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.join(process.cwd(), 'app', 'src', 'app', '(shell)');

describe('Track 9 Phase 3 Frontend Audit (Gemini)', () => {
  it('AUDIT: Subtitles page is a placeholder', () => {
    const content = fs.readFileSync(path.join(APP_ROOT, 'subtitles', 'page.tsx'), 'utf8');
    expect(content).toContain('SubtitlesPlaceholderPage');
    expect(content).toContain('EmptyPanel');
    expect(content).toContain('Track 7D');
  });

  it('AUDIT: Queue page is read-only scaffold', () => {
    const content = fs.readFileSync(path.join(APP_ROOT, 'queue', 'page.tsx'), 'utf8');
    expect(content).toContain('DataTable');
    // Check for absence of action buttons in columns or rowActions
    // The current file has no rowActions defined in DataTable props
    expect(content).not.toContain('rowActions={');
    expect(content).toContain('full controls in Track 7D');
  });

  it('AUDIT: Settings page is scaffold with hardcoded save', () => {
    const content = fs.readFileSync(path.join(APP_ROOT, 'settings', 'page.tsx'), 'utf8');
    expect(content).toContain('Settings surface is expanded in Track 7E');
    // Check for hardcoded mutation
    expect(content).toContain('pathVisibility: {');
    expect(content).toContain('showDownloadPath: true');
  });

  it('AUDIT: Dashboard is partial', () => {
    const content = fs.readFileSync(path.join(APP_ROOT, 'page.tsx'), 'utf8');
    expect(content).toContain('7E dashboard enhancements are pending');
    // Missing components check (heuristic)
    expect(content).not.toContain('Calendar');
    expect(content).not.toContain('ActivityFeed');
  });

  it('AUDIT: Indexers page has hardcoded protocol settings', () => {
    const content = fs.readFileSync(path.join(APP_ROOT, 'indexers', 'page.tsx'), 'utf8');
    expect(content).toContain('interface ProtocolSettingsState');
    expect(content).toContain('torrent: {');
    expect(content).toContain('usenet: {');
    // If it was dynamic, it would likely use a dynamic form generator
    expect(content).not.toContain('FormBuilder'); 
    expect(content).not.toContain('DynamicField');
  });
});

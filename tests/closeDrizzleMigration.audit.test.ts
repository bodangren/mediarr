import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_SRC = path.join(REPO_ROOT, 'server', 'src');
const TRACK_DIR = path.join(
  REPO_ROOT,
  'measure',
  'tracks',
  'chore_close_drizzle_migration_20260607',
);
const AUDIT_RESULTS_PATH = path.join(TRACK_DIR, 'audit-results.md');

const RAW_METHODS = ['$executeRawUnsafe', '$executeRaw', '$queryRawUnsafe', '$queryRaw'];
const RAW_METHOD_REGEX = new RegExp(
  `\\$(${RAW_METHODS.map((m) => m.slice(1)).join('|')})`,
  'g',
);

type Classification = 'type-declaration' | 'production-code' | 'test-mock' | 'comment-only';

interface AuditHit {
  file: string;
  line: number;
  snippet: string;
  classification: Classification;
  method: string;
}

function listSourceFiles(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue;
        stack.push(full);
      } else if (entry.isFile() && /\.ts$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function isCommentOnlyLine(rawLine: string): boolean {
  const trimmed = rawLine.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function isTypeDeclarationContext(content: string, index: number): boolean {
  const before = content.slice(Math.max(0, index - 80), index);
  return /interface\s+\w+\s*\{[^}]*$/i.test(before) ||
    /^\s*\??\s*\$/.test(content.slice(Math.max(0, index - 4), index));
}

function classify(filePath: string, rawLine: string, content: string, matchIndex: number): Classification {
  if (isCommentOnlyLine(rawLine)) return 'comment-only';
  if (/\.test\.[jt]sx?$/.test(filePath)) return 'test-mock';
  if (filePath.endsWith(path.join('types', 'prisma.ts'))) return 'type-declaration';
  if (isTypeDeclarationContext(content, matchIndex)) return 'type-declaration';
  return 'production-code';
}

function scan(): AuditHit[] {
  const hits: AuditHit[] = [];
  for (const file of listSourceFiles(SERVER_SRC)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const localRegex = new RegExp(RAW_METHOD_REGEX.source, 'g');
      let match: RegExpExecArray | null;
      while ((match = localRegex.exec(line)) !== null) {
        const absoluteIndex = offset + match.index;
        hits.push({
          file: path.relative(REPO_ROOT, file),
          line: i + 1,
          snippet: line.trim(),
          classification: classify(file, line, content, absoluteIndex),
          method: `$${match[1]}`,
        });
      }
      offset += line.length + 1;
    }
  }
  return hits;
}

function uniqueByClassification(hits: AuditHit[], cls: Classification): string[] {
  return Array.from(
    new Set(hits.filter((h) => h.classification === cls).map((h) => h.file)),
  ).sort();
}

function countByMethod(hits: AuditHit[], method: string, cls?: Classification): number {
  return hits.filter((h) => h.method === method && (cls ? h.classification === cls : true)).length;
}

describe('chore_close_drizzle_migration_20260607 — Phase S1: Audit & Catalog', () => {
  const hits = scan();
  const productionPaths = uniqueByClassification(hits, 'production-code');
  const typeDeclPaths = uniqueByClassification(hits, 'type-declaration');
  const testMockPaths = uniqueByClassification(hits, 'test-mock');
  const commentOnlyPaths = uniqueByClassification(hits, 'comment-only');

  describe('Source scan establishes the consolidated migration-tail scope', () => {
    it('finds raw-SQL shim references somewhere in server/src/', () => {
      expect(hits.length).toBeGreaterThan(0);
    });

    it('confirms the db/index.ts shim was already removed (drizzle_cleanup_type_safety_20260506)', () => {
      const dbIndexHits = hits.filter(
        (h) => h.file === path.join('server', 'src', 'db', 'index.ts'),
      );
      expect(dbIndexHits).toHaveLength(0);
    });

    it('identifies SystemHealthService.ts as a production $queryRaw call site', () => {
      const sysHealth = path.join('server', 'src', 'services', 'SystemHealthService.ts');
      const prodHits = hits.filter(
        (h) => h.file === sysHealth && h.classification === 'production-code',
      );
      expect(prodHits.length).toBeGreaterThanOrEqual(3);
      expect(prodHits.every((h) => h.method === '$queryRaw')).toBe(true);
    });

    it('identifies statsRoutes.ts as a production $queryRawUnsafe call site', () => {
      const statsRoutes = path.join('server', 'src', 'api', 'routes', 'statsRoutes.ts');
      const prodHits = hits.filter(
        (h) => h.file === statsRoutes && h.classification === 'production-code',
      );
      expect(prodHits.length).toBeGreaterThanOrEqual(3);
      expect(prodHits.every((h) => h.method === '$queryRawUnsafe')).toBe(true);
    });

    it('identifies the PrismaClient type shim file', () => {
      expect(typeDeclPaths).toContain(path.join('server', 'src', 'types', 'prisma.ts'));
    });

    it('captures the main.ts documentation comment (not a live call site)', () => {
      expect(commentOnlyPaths).toContain(path.join('server', 'src', 'main.ts'));
    });

    it('lists the four known test-mock files that will need updating in S2/S4/S5', () => {
      const expected = [
        path.join('server', 'src', 'api', 'routes', 'manualTestFindings.regression.test.ts'),
        path.join('server', 'src', 'api', 'routes', 'stats.integration.test.ts'),
        path.join('server', 'src', 'api', 'routes', 'statsRoutes.test.ts'),
        path.join('server', 'src', 'services', 'SystemHealthService.test.ts'),
      ];
      for (const file of expected) {
        expect(testMockPaths).toContain(file);
      }
    });

    it('reports zero production $executeRawUnsafe calls (already cleaned up by prior tracks)', () => {
      expect(countByMethod(hits, '$executeRawUnsafe', 'production-code')).toBe(0);
    });
  });

  describe('Consolidated audit catalog (audit-results.md) for the new track', () => {
    it('exists at the new track path', () => {
      expect(
        fs.existsSync(AUDIT_RESULTS_PATH),
        `Audit catalog must be committed at ${AUDIT_RESULTS_PATH}`,
      ).toBe(true);
    });

    it('declares the consolidated scope (raw-SQL shim + naming residue)', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      expect(text).toMatch(/Close Drizzle Migration|chore_close_drizzle_migration_20260607/);
      expect(text).toMatch(/Raw-SQL|raw SQL|raw-method/i);
    });

    it('contains a section for type-declaration call sites', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      expect(text).toMatch(/Type Declarations/i);
    });

    it('contains a section for production-code call sites', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      expect(text).toMatch(/Production Code/i);
    });

    it('contains a section for test-mock call sites', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      expect(text).toMatch(/Test Mocks/i);
    });

    it('documents every production-code file path', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      for (const file of productionPaths) {
        expect(
          text.includes(file),
          `audit-results.md must list production-code file ${file}`,
        ).toBe(true);
      }
    });

    it('documents every type-declaration file path', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      for (const file of typeDeclPaths) {
        expect(
          text.includes(file),
          `audit-results.md must list type-declaration file ${file}`,
        ).toBe(true);
      }
    });

    it('documents every test-mock file path', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      for (const file of testMockPaths) {
        expect(
          text.includes(file),
          `audit-results.md must list test-mock file ${file}`,
        ).toBe(true);
      }
    });

    it('provides a Drizzle replacement suggestion for every production-code file', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      for (const file of productionPaths) {
        const blockStart = text.indexOf(file);
        expect(blockStart, `production-code file ${file} not found in audit-results.md`).toBeGreaterThan(-1);
        const blockEnd = text.indexOf('\n## ', blockStart);
        const block = text.slice(blockStart, blockEnd === -1 ? text.length : blockEnd);
        expect(
          /Drizzle replacement/i.test(block),
          `audit-results.md must include a "Drizzle replacement" suggestion for ${file}`,
        ).toBe(true);
      }
    });

    it('notes the _drizzle_migrations vs _prisma_migrations guard required for SystemHealthService', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      expect(text).toMatch(/_drizzle_migrations|_prisma_migrations/);
    });

    it('reports summary counts that match the live scan', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      const allPaths = Array.from(new Set(hits.map((h) => h.file)));

      const totalMatch = text.match(/\*\*Total files with raw-method references:\*\*\s*(\d+)/);
      const typeMatch = text.match(/\*\*Type declaration files:\*\*\s*(\d+)/);
      const prodMatch = text.match(/\*\*Production code files:\*\*\s*(\d+)/);
      const testMatch = text.match(/\*\*Test mock files:\*\*\s*(\d+)/);
      const commentMatch = text.match(/\*\*Comment-only files:\*\*\s*(\d+)/);

      expect(totalMatch, 'audit-results.md must report the total file count').not.toBeNull();
      expect(typeMatch, 'audit-results.md must report the type-declaration count').not.toBeNull();
      expect(prodMatch, 'audit-results.md must report the production-code count').not.toBeNull();
      expect(testMatch, 'audit-results.md must report the test-mock count').not.toBeNull();
      expect(commentMatch, 'audit-results.md must report the comment-only count').not.toBeNull();

      expect(Number(totalMatch![1])).toBe(allPaths.length);
      expect(Number(typeMatch![1])).toBe(typeDeclPaths.length);
      expect(Number(prodMatch![1])).toBe(productionPaths.length);
      expect(Number(testMatch![1])).toBe(testMockPaths.length);
      expect(Number(commentMatch![1])).toBe(commentOnlyPaths.length);
    });

    it('reports per-method call-site counts so S2/S3 planning has a known blast radius', () => {
      if (!fs.existsSync(AUDIT_RESULTS_PATH)) return;
      const text = fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8');
      const queryRawMatch = text.match(/\*\*Production `\$queryRaw` call sites:\*\*\s*(\d+)/);
      const queryRawUnsafeMatch = text.match(/\*\*Production `\$queryRawUnsafe` call sites:\*\*\s*(\d+)/);
      const executeRawUnsafeMatch = text.match(/\*\*Production `\$executeRawUnsafe` call sites:\*\*\s*(\d+)/);

      expect(queryRawMatch, 'audit-results.md must report $queryRaw production call-site count').not.toBeNull();
      expect(queryRawUnsafeMatch, 'audit-results.md must report $queryRawUnsafe production call-site count').not.toBeNull();
      expect(executeRawUnsafeMatch, 'audit-results.md must report $executeRawUnsafe production call-site count').not.toBeNull();

      expect(Number(queryRawMatch![1])).toBe(countByMethod(hits, '$queryRaw', 'production-code'));
      expect(Number(queryRawUnsafeMatch![1])).toBe(countByMethod(hits, '$queryRawUnsafe', 'production-code'));
      expect(Number(executeRawUnsafeMatch![1])).toBe(countByMethod(hits, '$executeRawUnsafe', 'production-code'));
    });
  });
});

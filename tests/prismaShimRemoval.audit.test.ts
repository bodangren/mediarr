import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_SRC = path.join(REPO_ROOT, 'server', 'src');
const AUDIT_MD_PATH = path.join(
  REPO_ROOT,
  'measure',
  'tracks',
  'remove_prisma_shim_20260508',
  'audit.md',
);

const PRISMA_RAW_METHODS = ['$executeRawUnsafe', '$executeRaw', '$queryRawUnsafe', '$queryRaw'];
const RAW_METHOD_REGEX = new RegExp(`\\$(${PRISMA_RAW_METHODS.map((m) => m.slice(1)).join('|')})`, 'g');

type Classification = 'type-declaration' | 'production-code' | 'test-mock' | 'comment-only';

interface AuditHit {
  file: string;
  line: number;
  snippet: string;
  classification: Classification;
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

function isTypeDeclaration(content: string, index: number): boolean {
  const before = content.slice(Math.max(0, index - 80), index);
  return /interface\s+\w+\s*\{[^}]*$/i.test(before) || /^\s*\??\s*\$/.test(content.slice(Math.max(0, index - 4), index));
}

function classify(filePath: string, line: number, rawLine: string, fileContent: string, matchIndex: number): Classification {
  if (isCommentOnlyLine(rawLine)) return 'comment-only';
  if (/\.test\.[jt]sx?$/.test(filePath)) return 'test-mock';
  if (filePath.endsWith(path.join('types', 'prisma.ts'))) return 'type-declaration';
  if (isTypeDeclaration(fileContent, matchIndex)) return 'type-declaration';
  return 'production-code';
}

function scan(): AuditHit[] {
  const hits: AuditHit[] = [];
  for (const file of listSourceFiles(SERVER_SRC)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      const lineOffset = 0;
      const localRegex = new RegExp(RAW_METHOD_REGEX.source, 'g');
      while ((match = localRegex.exec(line)) !== null) {
        const absoluteIndex = lineOffset + match.index;
        const classification = classify(file, i + 1, line, content, absoluteIndex);
        hits.push({
          file: path.relative(REPO_ROOT, file),
          line: i + 1,
          snippet: line.trim(),
          classification,
        });
      }
    }
  }
  return hits;
}

function uniquePaths(hits: AuditHit[]): string[] {
  return Array.from(new Set(hits.map((h) => h.file))).sort();
}

function uniquePathsByClassification(hits: AuditHit[], classification: Classification): string[] {
  return Array.from(new Set(hits.filter((h) => h.classification === classification).map((h) => h.file))).sort();
}

describe('remove_prisma_shim_20260508 — Phase 1: Audit & Catalog', () => {
  const hits = scan();
  const allPaths = uniquePaths(hits);
  const productionPaths = uniquePathsByClassification(hits, 'production-code');
  const testMockPaths = uniquePathsByClassification(hits, 'test-mock');
  const typeDeclPaths = uniquePathsByClassification(hits, 'type-declaration');
  const commentOnlyPaths = uniquePathsByClassification(hits, 'comment-only');

  describe('Static analysis scan', () => {
    it('scans server/src/ for any $executeRaw* or $queryRaw* reference', () => {
      expect(hits.length).toBeGreaterThan(0);
    });

    it('finds no production-code $executeRawUnsafe in server/src/db/index.ts (shim already removed)', () => {
      const dbIndexHits = hits.filter((h) => h.file === path.join('server', 'src', 'db', 'index.ts'));
      expect(dbIndexHits).toHaveLength(0);
    });

    it('classifies the remaining production-code hits (statsRoutes) for cataloging (SystemHealthService cleaned in S2)', () => {
      expect(productionPaths).toEqual(
        expect.arrayContaining([
          path.join('server', 'src', 'api', 'routes', 'statsRoutes.ts'),
        ]),
      );
      expect(productionPaths).not.toContain(
        path.join('server', 'src', 'services', 'SystemHealthService.ts'),
      );
    });

    it('no longer classifies a type-declaration hit (prisma.ts shim deleted in S4)', () => {
      expect(typeDeclPaths).toEqual([]);
    });

    it('classifies the three test-mock files (SystemHealthService.test.ts cleaned in S2)', () => {
      expect(testMockPaths).toEqual(
        expect.arrayContaining([
          path.join('server', 'src', 'api', 'routes', 'manualTestFindings.regression.test.ts'),
          path.join('server', 'src', 'api', 'routes', 'stats.integration.test.ts'),
          path.join('server', 'src', 'api', 'routes', 'statsRoutes.test.ts'),
        ]),
      );
      expect(testMockPaths).not.toContain(
        path.join('server', 'src', 'services', 'SystemHealthService.test.ts'),
      );
    });

    it('confirms main.ts no longer has comment-only raw-method references (S2 extracted the function)', () => {
      expect(commentOnlyPaths).not.toContain(
        path.join('server', 'src', 'main.ts'),
      );
    });
  });

  describe('Catalog document (measure/tracks/remove_prisma_shim_20260508/audit.md)', () => {
    it('exists at the documented path', () => {
      expect(
        fs.existsSync(AUDIT_MD_PATH),
        `Audit catalog must be committed at ${AUDIT_MD_PATH}`,
      ).toBe(true);
    });

    it('contains a section for type-declaration hits', () => {
      if (!fs.existsSync(AUDIT_MD_PATH)) return;
      const catalog = fs.readFileSync(AUDIT_MD_PATH, 'utf8');
      expect(catalog).toMatch(/Type Declarations/i);
    });

    it('contains a section for production-code hits', () => {
      if (!fs.existsSync(AUDIT_MD_PATH)) return;
      const catalog = fs.readFileSync(AUDIT_MD_PATH, 'utf8');
      expect(catalog).toMatch(/Production Code/i);
    });

    it('contains a section for test-mock hits', () => {
      if (!fs.existsSync(AUDIT_MD_PATH)) return;
      const catalog = fs.readFileSync(AUDIT_MD_PATH, 'utf8');
      expect(catalog).toMatch(/Test Mocks/i);
    });

    it('documents every type-declaration file path', () => {
      if (!fs.existsSync(AUDIT_MD_PATH)) return;
      const catalog = fs.readFileSync(AUDIT_MD_PATH, 'utf8');
      for (const file of typeDeclPaths) {
        expect(
          catalog.includes(file),
          `audit.md must list type-declaration file ${file}`,
        ).toBe(true);
      }
    });

    it('documents every production-code file path', () => {
      if (!fs.existsSync(AUDIT_MD_PATH)) return;
      const catalog = fs.readFileSync(AUDIT_MD_PATH, 'utf8');
      for (const file of productionPaths) {
        expect(
          catalog.includes(file),
          `audit.md must list production-code file ${file}`,
        ).toBe(true);
      }
    });

    it('documents every test-mock file path', () => {
      if (!fs.existsSync(AUDIT_MD_PATH)) return;
      const catalog = fs.readFileSync(AUDIT_MD_PATH, 'utf8');
      for (const file of testMockPaths) {
        expect(
          catalog.includes(file),
          `audit.md must list test-mock file ${file}`,
        ).toBe(true);
      }
    });

    it('provides a Drizzle replacement suggestion for every production-code file', () => {
      if (!fs.existsSync(AUDIT_MD_PATH)) return;
      const catalog = fs.readFileSync(AUDIT_MD_PATH, 'utf8');
      for (const file of productionPaths) {
        const blockStart = catalog.indexOf(file);
        expect(blockStart, `production-code file ${file} not found in audit.md`).toBeGreaterThan(-1);
        const blockEnd = catalog.indexOf('\n## ', blockStart);
        const block = catalog.slice(blockStart, blockEnd === -1 ? catalog.length : blockEnd);
        expect(
          /Drizzle replacement/i.test(block),
          `audit.md must include a "Drizzle replacement" suggestion for ${file}`,
        ).toBe(true);
      }
    });

    it('summary counts in the catalog match the actual scan', () => {
      if (!fs.existsSync(AUDIT_MD_PATH)) return;
      const catalog = fs.readFileSync(AUDIT_MD_PATH, 'utf8');
      const totalMatch = catalog.match(/\*\*Total files with raw-method references:\*\*\s*(\d+)/);
      const typeMatch = catalog.match(/\*\*Type declaration files:\*\*\s*(\d+)/);
      const productionMatch = catalog.match(/\*\*Production code files:\*\*\s*(\d+)/);
      const testMatch = catalog.match(/\*\*Test mock files:\*\*\s*(\d+)/);
      const commentMatch = catalog.match(/\*\*Comment-only files:\*\*\s*(\d+)/);

      expect(totalMatch, 'audit.md must report the total file count').not.toBeNull();
      expect(typeMatch, 'audit.md must report the type-declaration count').not.toBeNull();
      expect(productionMatch, 'audit.md must report the production-code count').not.toBeNull();
      expect(testMatch, 'audit.md must report the test-mock count').not.toBeNull();
      expect(commentMatch, 'audit.md must report the comment-only count').not.toBeNull();

      expect(Number(totalMatch![1])).toBe(allPaths.length);
      expect(Number(typeMatch![1])).toBe(typeDeclPaths.length);
      expect(Number(productionMatch![1])).toBe(productionPaths.length);
      expect(Number(testMatch![1])).toBe(testMockPaths.length);
      expect(Number(commentMatch![1])).toBe(commentOnlyPaths.length);
    });
  });
});

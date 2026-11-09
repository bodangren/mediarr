import { spawn } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { classifySubtitleText } from './SubtitleAuditService';

/**
 * Traditional → Simplified Chinese normalisation for subtitle files (owner request 2026-11-08:
 * "some subtitles are in traditional Chinese instead of dual language").
 *
 * The conversion itself is OpenCC (`t2s`), installed in the automation venv; the conversion is
 * injectable so the file handling (backup, atomic write, skipping) is unit-tested without the CLI.
 * Default mode is a DRY RUN listing what would change: nothing is written unless `live: true`.
 */

export const defaultOpenccPython = (): string =>
  process.env.OPENCC_PYTHON
  ?? path.join(process.env.HOME ?? '', '.local', 'share', 'mediarr-automation', 'venv', 'bin', 'python');

/** Converts text through OpenCC t2s; ASCII/timing lines are unaffected by the conversion. */
export async function convertTraditionalToSimplified(text: string): Promise<string> {
  const script = 'import sys, opencc\nsys.stdout.write(opencc.OpenCC("t2s").convert(sys.stdin.read()))';
  return new Promise<string>((resolve, reject) => {
    const child = spawn(defaultOpenccPython(), ['-c', script], { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('opencc conversion timed out'));
    }, 120_000);
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`opencc exited ${code}: ${Buffer.concat(errors).toString('utf-8').slice(0, 200)}`));
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    child.stdin.end(text);
  });
}

export interface ScriptNormalizationResult {
  filePath: string;
  action: 'would-convert' | 'converted' | 'skipped';
  reason: string;
  sampleBefore: string | null;
  sampleAfter: string | null;
  backupPath: string | null;
}

function firstCueText(text: string): string | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  for (const line of lines) {
    if (/^\d+$/.test(line)) continue; // cue index
    if (/-->/.test(line)) continue; // timing
    return line;
  }
  return null;
}

export async function normalizeSubtitleScript(
  filePath: string,
  options: {
    live?: boolean;
    convert?: (text: string) => Promise<string>;
    readFile?: (file: string, encoding: 'utf-8') => Promise<string>;
    writeFile?: (file: string, text: string, encoding: 'utf-8') => Promise<void>;
    copyFile?: (from: string, to: string) => Promise<void>;
    rename?: (from: string, to: string) => Promise<void>;
    now?: Date;
  } = {},
): Promise<ScriptNormalizationResult> {
  const live = options.live === true;
  const convert = options.convert ?? convertTraditionalToSimplified;
  const readFile = options.readFile ?? ((file, encoding) => fsp.readFile(file, encoding));
  const writeFile = options.writeFile ?? ((file, data, encoding) => fsp.writeFile(file, data, encoding));
  const copyFile = options.copyFile ?? ((from, to) => fsp.copyFile(from, to));
  const rename = options.rename ?? ((from, to) => fsp.rename(from, to));

  let text: string;
  try {
    text = await readFile(filePath, 'utf-8');
  } catch (error) {
    return { filePath, action: 'skipped', reason: `unreadable: ${error instanceof Error ? error.message : String(error)}`, sampleBefore: null, sampleAfter: null, backupPath: null };
  }
  const classification = classifySubtitleText(text);
  if (classification.chineseVariant !== 'traditional') {
    return { filePath, action: 'skipped', reason: `not traditional (${classification.chineseVariant})`, sampleBefore: null, sampleAfter: null, backupPath: null };
  }

  const sampleBefore = firstCueText(text);
  let converted: string;
  try {
    converted = await convert(text);
  } catch (error) {
    return { filePath, action: 'skipped', reason: `conversion failed: ${error instanceof Error ? error.message : String(error)}`, sampleBefore, sampleAfter: null, backupPath: null };
  }
  const verified = classifySubtitleText(converted);
  if (verified.chineseVariant === 'traditional') {
    return { filePath, action: 'skipped', reason: 'conversion did not change the script', sampleBefore, sampleAfter: firstCueText(converted), backupPath: null };
  }

  const sampleAfter = firstCueText(converted);
  if (!live) {
    return { filePath, action: 'would-convert', reason: 'dry-run', sampleBefore, sampleAfter, backupPath: null };
  }

  const stamp = (options.now ?? new Date()).toISOString().slice(0, 10);
  const backupPath = `${filePath}.hant-${stamp}`;
  await copyFile(filePath, backupPath);
  // Atomic replace so a partially written conversion can never be served as a subtitle.
  const tempPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(tempPath, converted, 'utf-8');
  await rename(tempPath, filePath);
  return { filePath, action: 'converted', reason: 'live', sampleBefore, sampleAfter, backupPath };
}

export interface NormalizeBatchResult {
  scanned: number;
  converted: number;
  wouldConvert: number;
  skipped: number;
}

/**
 * Applies the normaliser across a list of Chinese sidecars (live by default false). Used by the scheduled
 * pass so newly extracted/downloaded traditional sidecars are simplified without waiting for an owner run.
 */
export async function normalizeSubtitleFiles(
  filePaths: readonly string[],
  options: {
    live?: boolean;
    limit?: number;
    normalize?: typeof normalizeSubtitleScript;
  } = {},
): Promise<NormalizeBatchResult> {
  const normalize = options.normalize ?? normalizeSubtitleScript;
  const limit = Math.max(1, options.limit ?? filePaths.length);
  const result: NormalizeBatchResult = { scanned: 0, converted: 0, wouldConvert: 0, skipped: 0 };
  for (const filePath of filePaths) {
    if (result.scanned >= limit) break;
    result.scanned += 1;
    const outcome = await normalize(filePath, { live: options.live === true });
    if (outcome.action === 'converted') result.converted += 1;
    else if (outcome.action === 'would-convert') result.wouldConvert += 1;
    else result.skipped += 1;
  }
  return result;
}


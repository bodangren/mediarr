import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import type { Aligner, AlignResult } from './SubtitleSyncService';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Runs ffsubsync (audio-based subtitle alignment) and reports the offset/scale
 * it actually applied. ffsubsync prints these to stderr; missing numbers are a
 * hard failure rather than an assumed zero.
 */
export class FfsubsyncAligner implements Aligner {
  private readonly bin: string;
  private readonly timeoutMs: number;

  constructor(options: { bin?: string; timeoutMs?: number } = {}) {
    this.bin = options.bin
      ?? process.env.SUBFSYNC_BIN
      ?? path.join(os.homedir(), '.local', 'share', 'mediarr-automation', 'venv', 'bin', 'ffsubsync');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  run(videoPath: string, inputSrt: string, outputSrt: string): Promise<AlignResult> {
    return new Promise((resolve, reject) => {
      const args = [videoPath, '-i', inputSrt, '-o', outputSrt, '--max-offset-seconds', '30'];
      const child = spawn(this.bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      let settled = false;
      const finish = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        finish(() => reject(new Error(`ffsubsync timed out after ${this.timeoutMs} ms`)));
      }, this.timeoutMs);
      child.stdout.on('data', () => { /* progress only */ });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
        if (stderr.length > 64_000) stderr = stderr.slice(-64_000);
      });
      child.on('error', error => finish(() => reject(error)));
      child.on('close', code => {
        if (code !== 0) {
          finish(() => reject(new Error(`ffsubsync exited ${code}: ${stderr.trim().split('\n').slice(-3).join(' | ')}`)));
          return;
        }
        const offset = /offset seconds:\s*(-?[\d.]+)/.exec(stderr);
        const scale = /framerate scale factor:\s*([\d.]+)/.exec(stderr);
        if (!offset || !scale) {
          finish(() => reject(new Error('ffsubsync reported no offset/scale')));
          return;
        }
        finish(() => resolve({ offsetSeconds: Number.parseFloat(offset[1]!), scale: Number.parseFloat(scale[1]!) }));
      });
    });
  }
}

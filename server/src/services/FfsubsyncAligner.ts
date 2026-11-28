import { spawn, type ChildProcess } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { lowPriorityCommand, SINGLE_THREAD_FFT_ENV } from './LowPriorityCommand';
import type { Aligner, AlignResult } from './SubtitleSyncService';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

type SpawnImpl = (
  command: string,
  args: readonly string[],
  options: { stdio: ['ignore', 'pipe', 'pipe']; env: NodeJS.ProcessEnv },
) => ChildProcess;

/**
 * Runs ffsubsync (audio-based subtitle alignment) and reports the offset/scale
 * it actually applied. ffsubsync prints these to stderr; missing numbers are a
 * hard failure rather than an assumed zero.
 *
 * Priority and thread policy are deliberately conservative: a cycle that spawned ffsubsync at
 * normal priority with OpenBLAS multithreading ran for 14 minutes on 2026-11-28 and left the engine
 * unresponsive for **392 s** (the TV timed out on every library-list request).
 */
export class FfsubsyncAligner implements Aligner {
  private readonly bin: string;
  private readonly timeoutMs: number;
  private readonly spawnImpl: SpawnImpl;

  constructor(options: {
    bin?: string;
    timeoutMs?: number;
    spawnImpl?: SpawnImpl;
  } = {}) {
    this.bin = options.bin
      ?? process.env.SUBFSYNC_BIN
      ?? path.join(os.homedir(), '.local', 'share', 'mediarr-automation', 'venv', 'bin', 'ffsubsync');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.spawnImpl = options.spawnImpl ?? (spawn as unknown as SpawnImpl);
  }

  run(videoPath: string, inputSrt: string, outputSrt: string): Promise<AlignResult> {
    return new Promise((resolve, reject) => {
      const args = [videoPath, '-i', inputSrt, '-o', outputSrt, '--max-offset-seconds', '30'];
      const { command, args: commandArgs } = lowPriorityCommand(this.bin, args);
      const child = this.spawnImpl(command, commandArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...SINGLE_THREAD_FFT_ENV },
      });
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
      child.stdout?.on('data', () => { /* progress only */ });
      child.stderr?.on('data', (chunk: Buffer) => {
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

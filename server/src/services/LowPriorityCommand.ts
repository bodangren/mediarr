/**
 * Priority policy for media children the engine spawns (yt-dlp, ffmpeg, ffsubsync).
 *
 * The TV streams from the same 4 TB USB volume these children read and write. On 2026-11-21 the
 * podcast transcode and the owner's playback collided and playback dropped frames (load average
 * 6.5); on 2026-11-28 a 14-minute `subtitle-sync` cycle spawned ffsubsync at normal priority and
 * the engine's event loop went unresponsive for **392 s** — the TV logged 24 receive timeouts on
 * `/api/youtube/*` and `/api/music/artists`. Background children must never outrank the API.
 */
export function lowPriorityCommand(
  binary: string,
  args: string[],
): { command: string; args: string[] } {
  return { command: 'nice', args: ['-n', '19', 'ionice', '-c', '3', binary, ...args] };
}

/**
 * Force single-threaded FFT/BLAS for numpy-based children (ffsubsync). OpenBLAS otherwise uses
 * every core and starves the Node event loop even at nice 19; a subtitle alignment on one thread is
 * plenty.
 */
export const SINGLE_THREAD_FFT_ENV: Readonly<Record<string, string>> = {
  OMP_NUM_THREADS: '1',
  OPENBLAS_NUM_THREADS: '1',
  MKL_NUM_THREADS: '1',
  NUMEXPR_NUM_THREADS: '1',
};

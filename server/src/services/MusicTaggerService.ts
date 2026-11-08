import { execFile } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { nameKey, resolveAlbum, resolveArtist, resolveTitle } from './MusicLibrary';
import { parseProbeOutput, type ProbedTrack } from './MusicScanner';

/**
 * Tag-and-file step for the Music library (track feature_music_library_20261107, Phase 2).
 *
 * beets does the identification (decision M4, MusicBrainz). It runs tag-only (`-M -C -w`) so this
 * service — not beets' own directory config — owns placement: tagged items go to
 * `<Artist>/<Album>/<NN> - <Title>`, and anything beets cannot identify goes to the review folder
 * with an explicit reason instead of being misfiled.
 */

const execFileAsync = promisify(execFile);

export interface TaggerOptions {
  musicRoot: string;
  reviewDir: string;
  beetPath?: string;
  timeoutMs?: number;
  runBeet?: (args: string[]) => Promise<void>;
  probe?: (file: string) => Promise<ProbedTrack>;
  fsOps?: {
    mkdir(dir: string, options?: { recursive?: boolean }): Promise<unknown>;
    rename(from: string, to: string): Promise<void>;
    stat(file: string): Promise<{ size: number }>;
  };
}

export interface TagOutcome {
  ok: boolean;
  filed: boolean;
  finalPath?: string;
  reason?: string;
  error?: string;
}

/** `<Artist>/<Album>/<NN> - <Title>.m4a`, with every filesystem-unsafe character removed. */
export function targetRelativePath(track: { artist: string | null; album: string | null; title: string | null; trackNumber: number | null }, ext: string): string {
  const safe = (value: string) => value.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  const artist = safe(resolveArtist(track.artist));
  const album = safe(resolveAlbum(track.album));
  const title = safe(resolveTitle(track.title, 'track'));
  const number = track.trackNumber !== null && track.trackNumber > 0
    ? String(track.trackNumber).padStart(2, '0')
    : '00';
  return path.join(artist, album, `${number} - ${title}${ext}`);
}

export class MusicTaggerService {
  private readonly options: TaggerOptions;
  private readonly runBeet: (args: string[]) => Promise<void>;
  private readonly probe: (file: string) => Promise<ProbedTrack>;
  private readonly io: NonNullable<TaggerOptions['fsOps']>;

  constructor(options: TaggerOptions) {
    this.options = options;
    this.runBeet = options.runBeet ?? (async (args) => {
      await execFileAsync(options.beetPath ?? process.env.BEET_PATH ?? 'beet', args, {
        timeout: options.timeoutMs ?? 300_000,
        maxBuffer: 8 * 1024 * 1024,
      });
    });
    this.probe = options.probe ?? (async (file) => {
      const { stdout } = await execFileAsync(
        process.env.FFPROBE_PATH ?? 'ffprobe',
        ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
        { timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
      );
      return parseProbeOutput(JSON.parse(String(stdout)));
    });
    this.io = options.fsOps ?? fsp;
  }

  async tagAndFile(stagedPath: string): Promise<TagOutcome> {
    try {
      // Tag-only import: no copy/move (this service owns placement), never prompt.
      await this.runBeet(['import', '-q', '-M', '-C', '-w', stagedPath]);
    } catch (error) {
      return { ok: false, filed: false, error: error instanceof Error ? error.message : String(error) };
    }

    let track: ProbedTrack;
    try {
      track = await this.probe(stagedPath);
    } catch (error) {
      return { ok: false, filed: false, error: `probe failed after tagging: ${error instanceof Error ? error.message : String(error)}` };
    }

    const missing = [
      track.artist === null || nameKey(track.artist) === 'unknown artist' ? 'artist' : null,
      track.album === null || nameKey(track.album) === 'unknown album' ? 'album' : null,
      track.title === null ? 'title' : null,
    ].filter((value): value is string => value !== null);

    if (missing.length > 0) {
      const reviewTarget = path.join(this.options.reviewDir, path.basename(stagedPath));
      await this.io.mkdir(this.options.reviewDir, { recursive: true });
      await this.io.rename(stagedPath, reviewTarget).catch(() => undefined);
      return {
        ok: true,
        filed: false,
        finalPath: reviewTarget,
        reason: `untaggable: missing ${missing.join(', ')} after beets`,
      };
    }

    const relative = targetRelativePath(track, path.extname(stagedPath) || '.m4a');
    const target = path.join(this.options.musicRoot, relative);
    await this.io.mkdir(path.dirname(target), { recursive: true });
    try {
      await this.io.rename(stagedPath, target);
    } catch (error) {
      return { ok: false, filed: false, error: error instanceof Error ? error.message : String(error) };
    }
    return { ok: true, filed: true, finalPath: target };
  }
}

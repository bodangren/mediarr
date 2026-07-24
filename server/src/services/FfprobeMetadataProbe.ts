import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type FfprobeExecutor = (
  executable: string,
  args: readonly string[],
  options: { maxBuffer: number },
) => Promise<{ stdout: string | Buffer }>;

export interface VariantMetadataProbe {
  probe(filePath: string): Promise<unknown>;
}

/** Reads stream metadata without invoking a shell. */
export class FfprobeMetadataProbe implements VariantMetadataProbe {
  constructor(
    private readonly execute: FfprobeExecutor = async (executable, args, options) =>
      execFileAsync(executable, [...args], options),
  ) {}

  async probe(filePath: string): Promise<unknown> {
    const { stdout } = await this.execute('ffprobe', [
      '-v',
      'error',
      '-show_streams',
      '-of',
      'json',
      filePath,
    ], { maxBuffer: 8 * 1024 * 1024 });

    return JSON.parse(stdout.toString());
  }
}

import fs from 'node:fs/promises';
import path from 'node:path';

interface DataDirectoryFileSystem {
  mkdir(directory: string, options: { recursive: true }): Promise<unknown>;
  writeFile(file: string, data: string, options: { flag: 'wx' }): Promise<void>;
  unlink(file: string): Promise<void>;
}

export interface RequiredDataDirectorySettings {
  mediaDir: string;
  incompleteDirectory: string;
  completeDirectory: string;
  movieRootFolder: string;
  tvRootFolder: string;
}

/** Resolve required storage paths, retaining custom roots and filling blank fresh-install settings. */
export function resolveRequiredDataDirectories(
  settings: RequiredDataDirectorySettings,
): string[] {
  const mediaDir = settings.mediaDir.trim() || '/data';
  const configuredOrDefault = (configured: string, relativeDefault: string) =>
    configured.trim() || path.join(mediaDir, relativeDefault);

  return [
    configuredOrDefault(settings.incompleteDirectory, 'downloads/incomplete'),
    configuredOrDefault(settings.completeDirectory, 'downloads/complete'),
    configuredOrDefault(settings.movieRootFolder, 'media/movies'),
    configuredOrDefault(settings.tvRootFolder, 'media/tv'),
  ];
}

/**
 * Ensures the required data directory structure exists on startup.
 */
export class DataDirectoryInitializer {
  constructor(
    private readonly directories: string[] = [],
    private readonly filesystem: DataDirectoryFileSystem = fs,
  ) {}

  async initialize(): Promise<void> {
    for (const dir of this.directories) {
      if (!dir || !dir.trim()) {
        continue;
      }
      const directory = dir.trim();
      const probePath = path.join(
        directory,
        `.mediarr-write-test-${process.pid}-${Date.now()}`,
      );
      try {
        await this.filesystem.mkdir(directory, { recursive: true });
        await this.filesystem.writeFile(probePath, '', { flag: 'wx' });
        await this.filesystem.unlink(probePath);
      } catch (error) {
        throw new Error(
          `Configured data directory '${directory}' is not writable; refusing to start.`,
          { cause: error },
        );
      }
    }
  }
}

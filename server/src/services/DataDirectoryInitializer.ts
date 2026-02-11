import fs from 'node:fs/promises';

const REQUIRED_DIRECTORIES = [
  '/data/downloads/incomplete',
  '/data/downloads/complete',
  '/data/media/tv',
  '/data/media/movies',
];

/**
 * Ensures the required data directory structure exists on startup.
 */
export class DataDirectoryInitializer {
  async initialize(): Promise<void> {
    for (const dir of REQUIRED_DIRECTORIES) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

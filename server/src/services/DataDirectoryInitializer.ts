import fs from 'node:fs/promises';

/**
 * Ensures the required data directory structure exists on startup.
 */
export class DataDirectoryInitializer {
  constructor(private readonly directories: string[] = []) {}

  async initialize(): Promise<void> {
    for (const dir of this.directories) {
      if (!dir || !dir.trim()) {
        continue;
      }
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

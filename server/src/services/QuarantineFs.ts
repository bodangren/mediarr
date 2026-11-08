import fs from 'node:fs/promises';

/** Node fs adapter for the quarantine engine's small I/O surface. */
export function createFsQuarantineAdapter() {
  return {
    mkdir: (dir: string, options?: { recursive?: boolean }) => fs.mkdir(dir, options),
    rename: (from: string, to: string) => fs.rename(from, to),
    copyFile: (from: string, to: string) => fs.copyFile(from, to),
    unlink: (file: string) => fs.unlink(file),
    stat: async (file: string) => ({ size: (await fs.stat(file)).size }),
  };
}

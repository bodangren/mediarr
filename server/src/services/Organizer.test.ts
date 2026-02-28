import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Organizer } from './Organizer';

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    link: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Organizer movie directory resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the movie subfolder when movie.path is a root folder', async () => {
    const fs = await import('node:fs/promises');
    const organizer = new Organizer();

    await organizer.organizeMovieFile('/downloads/The.Matrix.1999.mkv', {
      title: 'The Matrix',
      year: 1999,
      path: '/media/movies',
    });

    expect(fs.default.mkdir).toHaveBeenCalledWith(
      '/media/movies/The Matrix (1999)',
      { recursive: true },
    );
    expect(fs.default.link).toHaveBeenCalledWith(
      '/downloads/The.Matrix.1999.mkv',
      '/media/movies/The Matrix (1999)/The Matrix (1999).mkv',
    );
  });

  it('does not duplicate the movie subfolder when movie.path is already the movie folder', async () => {
    const fs = await import('node:fs/promises');
    const organizer = new Organizer();

    await organizer.organizeMovieFile('/downloads/The.Matrix.1999.mkv', {
      title: 'The Matrix',
      year: 1999,
      path: '/media/movies/The Matrix (1999)',
    });

    expect(fs.default.mkdir).toHaveBeenCalledWith(
      '/media/movies/The Matrix (1999)',
      { recursive: true },
    );
    expect(fs.default.link).toHaveBeenCalledWith(
      '/downloads/The.Matrix.1999.mkv',
      '/media/movies/The Matrix (1999)/The Matrix (1999).mkv',
    );
  });
});

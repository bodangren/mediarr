interface ImportGuardPrisma {
  episode: {
    findUnique: (args: { where: { id: number }; select: { path: true } }) => Promise<{ path: string | null } | null>;
  };
  movie: {
    findUnique: (args: { where: { id: number }; select: { path: true } }) => Promise<{ path: string | null } | null>;
  };
}

export async function isImportIncomplete(
  prisma: ImportGuardPrisma | undefined,
  torrent: { episodeId: number | null; movieId: number | null },
): Promise<{ incomplete: boolean; reason?: string }> {
  if (!prisma) {
    return { incomplete: false };
  }

  if (torrent.episodeId !== null) {
    const episode = await prisma.episode.findUnique({
      where: { id: torrent.episodeId },
      select: { path: true },
    });
    if (!episode) {
      return { incomplete: true, reason: `episode id=${torrent.episodeId} not found` };
    }
    if (!episode.path) {
      return { incomplete: true, reason: `episode id=${torrent.episodeId} has no path (import pending)` };
    }
  }

  if (torrent.movieId !== null) {
    const movie = await prisma.movie.findUnique({
      where: { id: torrent.movieId },
      select: { path: true },
    });
    if (!movie) {
      return { incomplete: true, reason: `movie id=${torrent.movieId} not found` };
    }
    if (!movie.path) {
      return { incomplete: true, reason: `movie id=${torrent.movieId} has no path (import pending)` };
    }
  }

  return { incomplete: false };
}

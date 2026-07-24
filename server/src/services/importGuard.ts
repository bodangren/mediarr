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
  torrent: { episodeId: number | null; episodeIds?: number[] | null; movieId: number | null },
): Promise<{ incomplete: boolean; reason?: string }> {
  if (!prisma) {
    return { incomplete: false };
  }

  const linkedEpisodeIds = torrent.episodeIds?.length
    ? [...new Set(torrent.episodeIds)]
    : torrent.episodeId === null ? [] : [torrent.episodeId];

  for (const episodeId of linkedEpisodeIds) {
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: { path: true },
    });
    if (!episode) {
      return { incomplete: true, reason: `episode id=${episodeId} not found` };
    }
    if (!episode.path) {
      return { incomplete: true, reason: `episode id=${episodeId} has no path (import pending)` };
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

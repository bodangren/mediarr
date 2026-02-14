export const routeMap = {
  series: '/api/series',
  seriesDetail: (id: number) => `/api/series/${id}`,
  seriesMonitored: (id: number) => `/api/series/${id}/monitored`,
  seriesDelete: (id: number) => `/api/series/${id}`,
  episodeMonitored: (id: number) => `/api/episodes/${id}`,

  movies: '/api/movies',
  movieDetail: (id: number) => `/api/movies/${id}`,
  movieMonitored: (id: number) => `/api/movies/${id}/monitored`,
  movieDelete: (id: number) => `/api/movies/${id}`,

  wanted: '/api/media/wanted',
  mediaSearch: '/api/media/search',
  mediaCreate: '/api/media',

  releaseSearch: '/api/releases/search',
  releaseGrab: '/api/releases/grab',

  torrents: '/api/torrents',
  torrentDetail: (infoHash: string) => `/api/torrents/${infoHash}`,
  torrentPause: (infoHash: string) => `/api/torrents/${infoHash}/pause`,
  torrentResume: (infoHash: string) => `/api/torrents/${infoHash}/resume`,
  torrentDelete: (infoHash: string) => `/api/torrents/${infoHash}`,
  torrentSpeedLimits: '/api/torrents/speed-limits',

  indexers: '/api/indexers',
  indexerUpdate: (id: number) => `/api/indexers/${id}`,
  indexerDelete: (id: number) => `/api/indexers/${id}`,
  indexerTest: (id: number) => `/api/indexers/${id}/test`,

  subtitleMovieVariants: (id: number) => `/api/subtitles/movie/${id}/variants`,
  subtitleEpisodeVariants: (id: number) => `/api/subtitles/episode/${id}/variants`,
  subtitleSearch: '/api/subtitles/search',
  subtitleDownload: '/api/subtitles/download',

  activity: '/api/activity',
  health: '/api/health',
  settings: '/api/settings',

  eventsStream: '/api/events/stream',
};

export const routeMap = {
  series: '/api/series',
  seriesDetail: (id: number) => `/api/series/${id}`,
  seriesSearch: (id: number) => `/api/series/${id}/search`,
  seriesMonitored: (id: number) => `/api/series/${id}/monitored`,
  seriesMonitoring: (id: number) => `/api/series/${id}/monitoring`,
  seriesBulkMonitoring: '/api/series/bulk/monitoring',
  seriesSeasonMonitoring: (seriesId: number, seasonNumber: number) =>
    `/api/series/${seriesId}/seasons/${seasonNumber}/monitoring`,
  seriesDelete: (id: number) => `/api/series/${id}`,
  episodeMonitored: (id: number) => `/api/episodes/${id}`,
  filters: '/api/filters',
  filterDetail: (id: number) => `/api/filters/${id}`,
  filtersCustom: '/api/filters/custom',
  filterCustomDetail: (id: number) => `/api/filters/custom/${id}`,

  movies: '/api/movies',
  movieDetail: (id: number) => `/api/movies/${id}`,
  movieSearch: (id: number) => `/api/movies/${id}/search`,
  movieMonitored: (id: number) => `/api/movies/${id}/monitored`,
  movieDelete: (id: number) => `/api/movies/${id}`,

  moviesMissing: '/api/movies/missing',
  moviesCutoffUnmet: '/api/movies/cutoff-unmet',

  wanted: '/api/media/wanted',
  wantedCreate: '/api/wanted',
  missingEpisodes: '/api/episodes/missing',
  cutoffUnmetEpisodes: '/api/episodes/cutoff-unmet',
  search: '/api/search',
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
  indexerSchema: (configContract: string, definitionId?: string) => {
    const encodedContract = encodeURIComponent(configContract);
    if (!definitionId) {
      return `/api/indexers/schema/${encodedContract}`;
    }

    return `/api/indexers/schema/${encodedContract}?definitionId=${encodeURIComponent(definitionId)}`;
  },
  indexerUpdate: (id: number) => `/api/indexers/${id}`,
  indexerDelete: (id: number) => `/api/indexers/${id}`,
  indexerTest: (id: number) => `/api/indexers/${id}/test`,
  indexerClone: (id: number) => `/api/indexers/${id}/clone`,
  indexerTestDraft: '/api/indexers/test',



  subtitleMovieVariants: (id: number) => `/api/subtitles/movie/${id}/variants`,
  subtitleMovieSync: (id: number) => `/api/subtitles/movie/${id}/sync`,
  subtitleMovieScan: (id: number) => `/api/subtitles/movie/${id}/scan`,
  subtitleMovieSearch: (id: number) => `/api/subtitles/movie/${id}/search`,
  subtitleMoviesBulk: '/api/subtitles/movies/bulk',
  subtitleEpisodeVariants: (id: number) => `/api/subtitles/episode/${id}/variants`,
  subtitleSearch: '/api/subtitles/search',
  subtitleDownload: '/api/subtitles/download',
  subtitleUpload: '/api/subtitles/upload',
  subtitleHistory: '/api/subtitles/history',
  subtitleHistoryStats: '/api/subtitles/history/stats',

  subtitleSeriesVariants: (seriesId: number) => `/api/subtitles/series/${seriesId}/variants`,
  subtitleEpisodeSubtitles: (episodeId: number) => `/api/subtitles/episodes/${episodeId}`,
  subtitleSeriesSync: (seriesId: number) => `/api/subtitles/series/${seriesId}/sync`,
  subtitleSeriesScan: (seriesId: number) => `/api/subtitles/series/${seriesId}/scan`,
  subtitleSeriesSearch: (seriesId: number) => `/api/subtitles/series/${seriesId}/search`,

  subtitleProviders: '/api/subtitles/providers',
  subtitleProvider: (id: string) => `/api/subtitles/providers/${id}`,
  subtitleProviderTest: (id: string) => `/api/subtitles/providers/${id}/test`,
  subtitleProviderReset: (id: string) => `/api/subtitles/providers/${id}/reset`,

  subtitleBlacklistSeries: '/api/subtitles/blacklist/series',
  subtitleBlacklistMovies: '/api/subtitles/blacklist/movies',
  subtitleBlacklistItem: (id: number) => `/api/subtitles/blacklist/${id}`,
  subtitleBlacklistSeriesClear: '/api/subtitles/blacklist/series',
  subtitleBlacklistMoviesClear: '/api/subtitles/blacklist/movies',

  subtitleWantedSeries: '/api/subtitles/wanted/series',
  subtitleWantedMovies: '/api/subtitles/wanted/movies',
  subtitleWantedSeriesSearch: '/api/subtitles/wanted/series/search',
  subtitleWantedMoviesSearch: '/api/subtitles/wanted/movies/search',
  subtitleWantedSeriesItemSearch: (seriesId: number) => `/api/subtitles/wanted/series/${seriesId}/search`,
  subtitleWantedMovieItemSearch: (movieId: number) => `/api/subtitles/wanted/movies/${movieId}/search`,
  subtitleWantedCount: '/api/subtitles/wanted/count',

  activity: '/api/activity',
  activityClear: '/api/activity',
  activityMarkFailed: (id: number) => `/api/activity/${id}/fail`,
  activityExport: '/api/activity/export',

  blocklist: '/api/blocklist',
  blocklistRemove: '/api/blocklist/remove',
  blocklistClear: '/api/blocklist/clear',

  health: '/api/health',
  settings: '/api/settings',
  settingsProxies: '/api/settings/proxies',
  settingsProxy: (id: number) => `/api/settings/proxies/${id}`,
  settingsCategories: '/api/settings/categories',
  settingsCategory: (id: number) => `/api/settings/categories/${id}`,

  downloadClient: '/api/download-client',

  notifications: '/api/notifications',
  notificationUpdate: (id: number) => `/api/notifications/${id}`,
  notificationDelete: (id: number) => `/api/notifications/${id}`,
  notificationTest: (id: number) => `/api/notifications/${id}/test`,
  notificationTestDraft: '/api/notifications/test',

  tasksScheduled: '/api/tasks/scheduled',
  tasksQueued: '/api/tasks/queued',
  tasksHistory: '/api/tasks/history',
  taskDetails: (id: number) => `/api/tasks/history/${id}`,
  taskRun: (taskId: string | number) => `/api/tasks/scheduled/${taskId}/run`,
  taskCancel: (taskId: number) => `/api/tasks/queued/${taskId}`,

  systemEvents: '/api/system/events',
  systemEventsClear: '/api/system/events/clear',
  systemEventsExport: '/api/system/events/export',

  tags: '/api/tags',
  tagUpdate: (id: number) => `/api/tags/${id}`,
  tagDelete: (id: number) => `/api/tags/${id}`,
  tagDetails: (id: number) => `/api/tags/${id}/details`,
  tagAssignments: (id: number) => `/api/tags/${id}/assignments`,

  qualityProfiles: '/api/quality-profiles',
  qualityProfile: (id: number) => `/api/quality-profiles/${id}`,

  languageProfiles: '/api/subtitles/language-profiles',
  languageProfile: (id: number) => `/api/subtitles/language-profiles/${id}`,

  eventsStream: '/api/events/stream',

  backups: '/api/backups',
  backupCreate: '/api/backups',
  backupSchedule: '/api/backups/schedule',
  backupRestore: (id: number) => `/api/backups/${id}/restore`,
  backupDownload: (id: number) => `/api/backups/${id}/download`,
  backupDelete: (id: number) => `/api/backups/${id}`,

  logsFiles: '/api/logs/files',
  logsFile: (filename: string) => `/api/logs/files/${encodeURIComponent(filename)}`,
  logsFileDownload: (filename: string) => `/api/logs/files/${encodeURIComponent(filename)}/download`,
  logsFileClear: (filename: string) => `/api/logs/files/${encodeURIComponent(filename)}/clear`,

  updatesCurrent: '/api/updates/current',
  updatesAvailable: '/api/updates/available',
  updatesCheck: '/api/updates/check',
  updatesInstall: '/api/updates/install',
  updatesHistory: '/api/updates/history',
  updatesProgress: (updateId: string) => `/api/updates/progress/${updateId}`,

  collections: '/api/collections',
  collectionDetail: (id: number) => `/api/collections/${id}`,
  collectionUpdate: (id: number) => `/api/collections/${id}`,
  collectionDelete: (id: number) => `/api/collections/${id}`,
  collectionSearch: (id: number) => `/api/collections/${id}/search`,
  collectionSync: (id: number) => `/api/collections/${id}/sync`,

  discover: '/api/discover/movies',

  importScan: '/api/import/scan',
  importSeries: '/api/import/series',
  importBulkSeries: '/api/import/series/bulk',

  customFormats: '/api/custom-formats',
  customFormat: (id: number) => `/api/custom-formats/${id}`,
  customFormatTest: (id: number) => `/api/custom-formats/${id}/test`,
  customFormatSchema: '/api/custom-formats/schema',
};

export interface ApiRouteDefinition {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
}

export const API_ROUTE_MAP: ApiRouteDefinition[] = [
  { method: 'GET', path: '/api/calendar' },

  { method: 'GET', path: '/api/series' },
  { method: 'GET', path: '/api/series/:id' },
  { method: 'PATCH', path: '/api/series/:id/monitored' },
  { method: 'PATCH', path: '/api/episodes/:id' },
  { method: 'DELETE', path: '/api/series/:id' },

  { method: 'GET', path: '/api/movies' },
  { method: 'GET', path: '/api/movies/:id' },
  { method: 'PATCH', path: '/api/movies/:id/monitored' },
  { method: 'DELETE', path: '/api/movies/:id' },

  { method: 'GET', path: '/api/media/wanted' },
  { method: 'POST', path: '/api/media/search' },
  { method: 'POST', path: '/api/media' },

  { method: 'POST', path: '/api/releases/search' },
  { method: 'POST', path: '/api/releases/grab' },
  { method: 'POST', path: '/api/releases/grab-candidate' },

  { method: 'GET', path: '/api/torrents' },
  { method: 'GET', path: '/api/torrents/:infoHash' },
  { method: 'POST', path: '/api/torrents' },
  { method: 'PATCH', path: '/api/torrents/:infoHash/pause' },
  { method: 'PATCH', path: '/api/torrents/:infoHash/resume' },
  { method: 'DELETE', path: '/api/torrents/:infoHash' },
  { method: 'PATCH', path: '/api/torrents/speed-limits' },

  { method: 'GET', path: '/api/indexers' },
  { method: 'POST', path: '/api/indexers' },
  { method: 'POST', path: '/api/indexers/test' },
  { method: 'PUT', path: '/api/indexers/:id' },
  { method: 'DELETE', path: '/api/indexers/:id' },
  { method: 'POST', path: '/api/indexers/:id/test' },

  { method: 'GET', path: '/api/subtitles/movie/:id/variants' },
  { method: 'GET', path: '/api/subtitles/episode/:id/variants' },
  { method: 'POST', path: '/api/subtitles/search' },
  { method: 'POST', path: '/api/subtitles/download' },

  { method: 'GET', path: '/api/activity' },
  { method: 'DELETE', path: '/api/activity' },
  { method: 'PATCH', path: '/api/activity/:id/fail' },
  { method: 'GET', path: '/api/activity/export' },
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/settings' },
  { method: 'PATCH', path: '/api/settings' },

  { method: 'GET', path: '/api/events/stream' },

  // System routes
  { method: 'GET', path: '/api/system/status' },
  { method: 'GET', path: '/api/tasks/scheduled' },
  { method: 'GET', path: '/api/tasks/queued' },
  { method: 'GET', path: '/api/tasks/history' },
  { method: 'GET', path: '/api/tasks/history/:id' },
  { method: 'POST', path: '/api/tasks/scheduled/:taskId/run' },
  { method: 'DELETE', path: '/api/tasks/queued/:taskId' },
  { method: 'GET', path: '/api/system/events' },
  { method: 'DELETE', path: '/api/system/events/clear' },
  { method: 'GET', path: '/api/system/events/export' },

  // Backup routes
  { method: 'GET', path: '/api/backups' },
  { method: 'POST', path: '/api/backups' },
  { method: 'GET', path: '/api/backups/schedule' },
  { method: 'PATCH', path: '/api/backups/schedule' },
  { method: 'POST', path: '/api/backups/:id/restore' },
  { method: 'POST', path: '/api/backups/:id/download' },
  { method: 'DELETE', path: '/api/backups/:id' },

  // Logs routes
  { method: 'GET', path: '/api/logs/files' },
  { method: 'GET', path: '/api/logs/files/:filename' },
  { method: 'DELETE', path: '/api/logs/files/:filename' },
  { method: 'POST', path: '/api/logs/files/:filename/clear' },
  { method: 'GET', path: '/api/logs/files/:filename/download' },
  { method: 'GET', path: '/api/logs/files/:filename/raw' },

  // Updates routes
  { method: 'GET', path: '/api/updates/current' },
  { method: 'GET', path: '/api/updates/available' },
  { method: 'POST', path: '/api/updates/check' },
  { method: 'POST', path: '/api/updates/install' },
  { method: 'GET', path: '/api/updates/history' },
  { method: 'GET', path: '/api/updates/progress/:updateId' },

  // Notification routes
  { method: 'GET', path: '/api/notifications' },
  { method: 'GET', path: '/api/notifications/:id' },
  { method: 'POST', path: '/api/notifications' },
  { method: 'PUT', path: '/api/notifications/:id' },
  { method: 'DELETE', path: '/api/notifications/:id' },
  { method: 'POST', path: '/api/notifications/:id/test' },
  { method: 'POST', path: '/api/notifications/test' },
  { method: 'POST', path: '/api/notifications/schema' },
  { method: 'GET', path: '/api/notifications/types' },

  // Download Client routes
  { method: 'GET', path: '/api/download-clients' },
  { method: 'GET', path: '/api/download-clients/:id' },
  { method: 'POST', path: '/api/download-clients' },
  { method: 'PUT', path: '/api/download-clients/:id' },
  { method: 'DELETE', path: '/api/download-clients/:id' },
  { method: 'POST', path: '/api/download-clients/:id/test' },
  { method: 'POST', path: '/api/download-clients/test' },
  { method: 'POST', path: '/api/download-clients/schema' },

  // Blocklist routes
  { method: 'GET', path: '/api/blocklist' },
  { method: 'DELETE', path: '/api/blocklist/remove' },
  { method: 'DELETE', path: '/api/blocklist/clear' },
  { method: 'DELETE', path: '/api/blocklist/:id' },

  // Quality Profile routes
  { method: 'GET', path: '/api/quality-profiles' },
  { method: 'GET', path: '/api/quality-profiles/:id' },
  { method: 'POST', path: '/api/quality-profiles' },
  { method: 'PUT', path: '/api/quality-profiles/:id' },
  { method: 'DELETE', path: '/api/quality-profiles/:id' },
  { method: 'GET', path: '/api/quality-definitions' },
];

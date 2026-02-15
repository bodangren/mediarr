export interface ApiRouteDefinition {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
}

export const API_ROUTE_MAP: ApiRouteDefinition[] = [
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
];

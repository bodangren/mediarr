import { createActivityApi } from './activityApi';
import { createEventsApi } from './eventsApi';
import { createHealthApi } from './healthApi';
import { ApiHttpClient, type ApiHttpClientConfig } from './httpClient';
import { createIndexerApi } from './indexerApi';
import { createMediaApi } from './mediaApi';
import { createReleaseApi } from './releaseApi';
import { createSettingsApi } from './settingsApi';
import { createSubtitleApi } from './subtitleApi';
import { createTorrentApi } from './torrentApi';

export function createApiClients(config: ApiHttpClientConfig = {}) {
  const httpClient = new ApiHttpClient(config);

  return {
    httpClient,
    mediaApi: createMediaApi(httpClient),
    releaseApi: createReleaseApi(httpClient),
    torrentApi: createTorrentApi(httpClient),
    indexerApi: createIndexerApi(httpClient),
    subtitleApi: createSubtitleApi(httpClient),
    activityApi: createActivityApi(httpClient),
    settingsApi: createSettingsApi(httpClient),
    healthApi: createHealthApi(httpClient),
    eventsApi: createEventsApi({
      baseUrl: config.baseUrl,
    }),
  };
}

export { ApiClientError, ContractViolationError } from './errors';
export { ApiHttpClient } from './httpClient';
export { routeMap } from './routeMap';

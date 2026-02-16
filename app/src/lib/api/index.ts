import { createActivityApi } from './activityApi';
import { createApplicationsApi } from './applicationsApi';
import { createBackupApi } from './backupApi';
import { createBlocklistApi } from './blocklistApi';
import { createCalendarApi } from './calendarApi';
import { createEventsApi } from './eventsApi';
import { createHealthApi } from './healthApi';
import { ApiHttpClient, type ApiHttpClientConfig } from './httpClient';
import { createIndexerApi } from './indexerApi';
import { createLogsApi } from './logsApi';
import { createMediaApi } from './mediaApi';
import { createQualityProfileApi } from './qualityProfileApi';
import { createReleaseApi } from './releaseApi';
import { createSettingsApi } from './settingsApi';
import { createSubtitleApi } from './subtitleApi';
import { createTagsApi } from './tagsApi';
import { createTorrentApi } from './torrentApi';
import { createDownloadClientApi } from './downloadClientsApi';
import { createNotificationsApi } from './notificationsApi';
import { createSystemApi } from './systemApi';
import { createUpdatesApi } from './updatesApi';

export function createApiClients(config: ApiHttpClientConfig = {}) {
  const httpClient = new ApiHttpClient(config);

  return {
    httpClient,
    mediaApi: createMediaApi(httpClient),
    releaseApi: createReleaseApi(httpClient),
    torrentApi: createTorrentApi(httpClient),
    indexerApi: createIndexerApi(httpClient),
    applicationsApi: createApplicationsApi(httpClient),
    downloadClientApi: createDownloadClientApi(httpClient),
    tagsApi: createTagsApi(httpClient),
    subtitleApi: createSubtitleApi(httpClient),
    activityApi: createActivityApi(httpClient),
    calendarApi: createCalendarApi(httpClient),
    blocklistApi: createBlocklistApi(httpClient),
    settingsApi: createSettingsApi(httpClient),
    healthApi: createHealthApi(httpClient),
    notificationsApi: createNotificationsApi(httpClient),
    systemApi: createSystemApi(httpClient),
    backupApi: createBackupApi(httpClient),
    logsApi: createLogsApi(httpClient),
    updatesApi: createUpdatesApi(httpClient),
    qualityProfileApi: createQualityProfileApi(httpClient),
    eventsApi: createEventsApi({
      baseUrl: config.baseUrl,
    }),
  };
}

export { ApiClientError, ContractViolationError } from './errors';
export { ApiHttpClient } from './httpClient';
export { routeMap } from './routeMap';

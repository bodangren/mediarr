import { createActivityApi } from './activityApi';
import { createAppProfilesApi } from './appProfilesApi';
import { createApplicationsApi } from './applicationsApi';
import { createBackupApi } from './backupApi';
import { createBlocklistApi } from './blocklistApi';
import { createCalendarApi } from './calendarApi';
import { createCategorySettingsApi } from './categorySettingsApi';
import { createCollectionApi } from './collectionApi';
import { createCustomFormatApi } from './customFormatApi';
import { createDiscoverApi } from './discoverApi';
import { createEventsApi } from './eventsApi';
import { createFiltersApi } from './filters';
import { createHealthApi } from './healthApi';
import { ApiHttpClient } from './httpClient';
import { createImportApi } from './importApi';
import { createImportListsApi } from './importListsApi';
import { createIndexerApi } from './indexerApi';
import { createLanguageProfilesApi } from './languageProfilesApi';
import { createLogsApi } from './logsApi';
import { createMediaApi } from './mediaApi';
import { createMovieApi } from './movieApi';
import { createQualityProfileApi } from './qualityProfileApi';
import { createReleaseApi } from './releaseApi';
import { createSeriesApi } from './seriesApi';
import { createSettingsApi } from './settingsApi';
import { createProxySettingsApi } from './proxySettingsApi';
import { createSubtitleApi } from './subtitleApi';
import { createSubtitleBlacklistApi } from './subtitleBlacklistApi';
import { createSubtitleHistoryApi } from './subtitleHistoryApi';
import { createSubtitleProvidersApi } from './subtitleProvidersApi';
import { createSubtitleWantedApi } from './subtitleWantedApi';
import { createTagsApi } from './tagsApi';
import { createTorrentApi } from './torrentApi';
import { createDownloadClientApi } from './downloadClientsApi';
import { createNotificationsApi } from './notificationsApi';
import { createSystemApi } from './systemApi';
import { createUpdatesApi } from './updatesApi';
import { createWantedApi } from './wantedApi';
export function createApiClients(config = {}) {
    const httpClient = new ApiHttpClient(config);
    return {
        httpClient,
        mediaApi: createMediaApi(httpClient),
        releaseApi: createReleaseApi(httpClient),
        torrentApi: createTorrentApi(httpClient),
        importApi: createImportApi(httpClient),
        indexerApi: createIndexerApi(httpClient),
        applicationsApi: createApplicationsApi(httpClient),
        appProfilesApi: createAppProfilesApi(httpClient),
        downloadClientApi: createDownloadClientApi(httpClient),
        importListsApi: createImportListsApi(httpClient),
        tagsApi: createTagsApi(httpClient),
        subtitleApi: createSubtitleApi(httpClient),
        subtitleBlacklistApi: createSubtitleBlacklistApi(httpClient),
        subtitleHistoryApi: createSubtitleHistoryApi(httpClient),
        subtitleProvidersApi: createSubtitleProvidersApi(httpClient),
        subtitleWantedApi: createSubtitleWantedApi(httpClient),
        activityApi: createActivityApi(httpClient),
        calendarApi: createCalendarApi(httpClient),
        categorySettingsApi: createCategorySettingsApi(httpClient),
        collectionApi: createCollectionApi(httpClient),
        discoverApi: createDiscoverApi(httpClient),
        filtersApi: createFiltersApi(httpClient),
        blocklistApi: createBlocklistApi(httpClient),
        settingsApi: createSettingsApi(httpClient),
        healthApi: createHealthApi(httpClient),
        notificationsApi: createNotificationsApi(httpClient),
        proxySettingsApi: createProxySettingsApi(httpClient),
        systemApi: createSystemApi(httpClient),
        backupApi: createBackupApi(httpClient),
        logsApi: createLogsApi(httpClient),
        updatesApi: createUpdatesApi(httpClient),
        qualityProfileApi: createQualityProfileApi(httpClient),
        customFormatApi: createCustomFormatApi(httpClient),
        languageProfilesApi: createLanguageProfilesApi(httpClient),
        wantedApi: createWantedApi(httpClient),
        movieApi: createMovieApi(httpClient),
        seriesApi: createSeriesApi(httpClient),
        eventsApi: createEventsApi({
            baseUrl: config.baseUrl,
        }),
    };
}
export { ApiClientError, ContractViolationError } from './errors';
export { ApiHttpClient } from './httpClient';
export { routeMap } from './routeMap';
//# sourceMappingURL=index.js.map
import type { PrismaClient } from '../db/prismaClient';

export const MOVIE_NAMING_PATTERN = '{Movie.Title}.{Release.Year}.{Quality.Full}.{MediaInfo.VideoCodec}';
export const SERIES_NAMING_PATTERN = '{Series.Title}.S{season:00}E{episode:00}.{Episode.Title}.{Quality.Full}';
export const DEFAULT_WANTED_LANGUAGES = ['en'];
export const DEFAULT_WANTED_SEARCH_MINUTES = 60;
export const DEFAULT_RSS_SYNC_MINUTES = 15;
export const BUILTIN_WEBTORRENT_NAME = 'Built-in WebTorrent';
export const BUILTIN_WEBTORRENT_INCOMPLETE_DIR = '/data/downloads/incomplete';

export async function seedSmartDefaults(prisma: PrismaClient): Promise<void> {
  const existingClients = await prisma.downloadClient.findMany();
  const hasNoDownloadClients = existingClients.length === 0;

  if (hasNoDownloadClients) {
    await prisma.downloadClient.create({
      data: {
        name: BUILTIN_WEBTORRENT_NAME,
        protocol: 'torrent',
        type: 'builtin',
        enabled: true,
        priority: 1,
        config: JSON.stringify({
          host: '127.0.0.1',
          port: 0,
          useSsl: false,
          torrentDirectory: BUILTIN_WEBTORRENT_INCOMPLETE_DIR,
        }),
      },
    });
  }

  const settingsRecord = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const current = settingsRecord ? JSON.parse(JSON.stringify(settingsRecord)) as Record<string, unknown> : null;

  let hasAnyChange = false;

  const newMediaManagement: Record<string, string> = {};
  if (!current?.mediaManagement?.movieNamingPattern) {
    newMediaManagement.movieNamingPattern = MOVIE_NAMING_PATTERN;
    hasAnyChange = true;
  }
  if (!current?.mediaManagement?.seriesNamingPattern) {
    newMediaManagement.seriesNamingPattern = SERIES_NAMING_PATTERN;
    hasAnyChange = true;
  }

  const newSchedulerIntervals: Record<string, number> = {};
  if (!current?.schedulerIntervals?.wantedSearchMinutes) {
    newSchedulerIntervals.wantedSearchMinutes = DEFAULT_WANTED_SEARCH_MINUTES;
    hasAnyChange = true;
  }
  if (!current?.schedulerIntervals?.rssSyncMinutes) {
    newSchedulerIntervals.rssSyncMinutes = DEFAULT_RSS_SYNC_MINUTES;
    hasAnyChange = true;
  }

  const currentWantedLanguages = current?.update?.wantedLanguages as string[] | undefined;
  const needsWantedLanguages =
    !currentWantedLanguages ||
    currentWantedLanguages.length === 0 ||
    (currentWantedLanguages.length === 1 && currentWantedLanguages[0] === '');
  if (needsWantedLanguages) {
    hasAnyChange = true;
  }

  if (!hasAnyChange) {
    return;
  }

  const currentMediaManagement = (current?.mediaManagement ?? {}) as Record<string, unknown>;
  const currentSchedulerIntervals = (current?.schedulerIntervals ?? {}) as Record<string, unknown>;
  const currentUpdate = (current?.update ?? {}) as Record<string, unknown>;

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      torrentLimits: current?.torrentLimits ?? {},
      schedulerIntervals: {
        ...currentSchedulerIntervals,
        ...newSchedulerIntervals,
      },
      pathVisibility: current?.pathVisibility ?? {},
      apiKeys: current?.apiKeys ?? {},
      host: current?.host ?? {},
      security: current?.security ?? {},
      logging: current?.logging ?? {},
      update: {
        ...currentUpdate,
        wantedLanguages: needsWantedLanguages ? DEFAULT_WANTED_LANGUAGES : (currentWantedLanguages ?? []),
      },
      mediaManagement: {
        ...currentMediaManagement,
        ...newMediaManagement,
      },
      streaming: current?.streaming ?? {},
    },
    update: {
      torrentLimits: current?.torrentLimits ?? {},
      schedulerIntervals: {
        ...currentSchedulerIntervals,
        ...newSchedulerIntervals,
      },
      pathVisibility: current?.pathVisibility ?? {},
      apiKeys: current?.apiKeys ?? {},
      host: current?.host ?? {},
      security: current?.security ?? {},
      logging: current?.logging ?? {},
      update: {
        ...currentUpdate,
        wantedLanguages: needsWantedLanguages ? DEFAULT_WANTED_LANGUAGES : (currentWantedLanguages ?? []),
      },
      mediaManagement: {
        ...currentMediaManagement,
        ...newMediaManagement,
      },
      streaming: current?.streaming ?? {},
    },
  });
}

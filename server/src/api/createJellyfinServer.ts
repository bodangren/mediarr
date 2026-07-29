import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import type { ApiDependencies } from './types';
import { decodeJellyfinId, encodeJellyfinId, JELLYFIN_MOVIE_VIEW_ID, JELLYFIN_TV_VIEW_ID } from '../jellyfin/ids';
import { getCatalogItem, mapEpisodeToItem, queryCatalog, queryEpisodesWithNavigation, querySeasons, type CatalogQuery, type EpisodeQueryOptions, type JellyfinCatalogItem, type JellyfinCatalogQueryResult } from '../jellyfin/catalog';
import { createPrismaJellyfinCatalog } from '../jellyfin/prismaCatalog';
import { buildDirectPlayMediaSource, decodePlaybackTarget } from '../jellyfin/playback';
import { sendByteRangeStream } from './utils/byteRangeStreaming';
import { JellyfinSessionRegistry } from '../jellyfin/sessions';
import { continueWatchingToJellyfinResume, jellyfinProgressToHeartbeat, type NextUpOptions } from '../jellyfin/playbackState';
import { proxyJellyfinArtwork, resolveJellyfinArtworkSource } from '../jellyfin/artwork';
import { createPrismaJellyfinPlaybackState, derivePrismaNextUpCatalogItems } from '../jellyfin/prismaPlaybackState';
import { buildJellyfinPublicSystemInfo, buildJellyfinSystemInfo, buildTrustedLanUserDto } from '../jellyfin/compatibilityDtos';
import { sharedPlaybackStateToJellyfinUserData } from '../jellyfin/userData';

export interface JellyfinServerOptions {
  serverId: string;
  serverName: string;
  version?: string;
  lanAddress?: string;
  port?: number;
}

const COMPAT_USER_ID = '4d656469-6172-7200-0000-000000000001';

function user(serverId: string) {
  return buildTrustedLanUserDto({ serverId, userId: COMPAT_USER_ID, userName: 'Mediarr' });
}

function views() {
  return [
    { Id: JELLYFIN_MOVIE_VIEW_ID, Name: 'Movies', CollectionType: 'movies', Type: 'CollectionFolder', IsFolder: true },
    { Id: JELLYFIN_TV_VIEW_ID, Name: 'TV Shows', CollectionType: 'tvshows', Type: 'CollectionFolder', IsFolder: true },
  ];
}

function catalogQuery(query: Record<string, unknown>): CatalogQuery {
  const normalized: CatalogQuery = {};
  const parentId = query.ParentId ?? query.parentId;
  const startIndex = query.StartIndex ?? query.startIndex;
  const limit = query.Limit ?? query.limit;
  const sortBy = query.SortBy ?? query.sortBy;
  const sortOrder = query.SortOrder ?? query.sortOrder;
  const includeItemTypes = query.IncludeItemTypes ?? query.includeItemTypes;

  if (typeof parentId === "string") normalized.parentId = parentId;
  if (typeof startIndex === "string" || typeof startIndex === "number") normalized.startIndex = startIndex;
  if (typeof limit === "string" || typeof limit === "number") normalized.limit = limit;
  if (typeof sortBy === "string") normalized.sortBy = sortBy;
  if (typeof sortOrder === "string") normalized.sortOrder = sortOrder;
  if (typeof includeItemTypes === "string") normalized.includeItemTypes = includeItemTypes;

  return normalized;
}

function sessionIdentity(deviceId: string | undefined) {
  return {
    id: deviceId ?? 'unknown',
    userId: 'lan-default',
    ...(deviceId === undefined ? {} : { deviceId }),
  };
}

function nextUpOptions(query: { SeriesId?: string; Limit?: string }): NextUpOptions | null {
  const decoded = query.SeriesId ? decodeJellyfinId(query.SeriesId) : null;
  if (query.SeriesId && decoded?.kind !== 'series') return null;
  return {
    userId: 'lan-default',
    ...(decoded?.kind === 'series' ? { seriesId: decoded.id } : {}),
    ...(query.Limit ? { limit: Number(query.Limit) } : {}),
  };
}

function episodeNavigationQuery(query: Record<string, unknown>): EpisodeQueryOptions {
  const pick = (upper: string, lower: string) => query[upper] ?? query[lower];
  const normalized: EpisodeQueryOptions = {};
  const season = pick('Season', 'season');
  const startItemId = pick('StartItemId', 'startItemId');
  const adjacentTo = pick('AdjacentTo', 'adjacentTo');
  const startIndex = pick('StartIndex', 'startIndex');
  const limit = pick('Limit', 'limit');
  if (typeof season === 'string' || typeof season === 'number') normalized.season = season;
  if (typeof startItemId === 'string') normalized.startItemId = startItemId;
  if (typeof adjacentTo === 'string') normalized.adjacentTo = adjacentTo;
  if (typeof startIndex === 'string' || typeof startIndex === 'number') normalized.startIndex = startIndex;
  if (typeof limit === 'string' || typeof limit === 'number') normalized.limit = limit;
  return normalized;
}

function emptyPlaybackInfo(itemId: string) {
  return { MediaSources: [], PlaySessionId: itemId };
}

/** Creates a deliberately separate Jellyfin-shaped HTTP surface sharing Mediarr dependencies. */
export function createJellyfinServer(dependencies: Pick<ApiDependencies, 'prisma' | 'playbackService'>, options: JellyfinServerOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  const catalog = createPrismaJellyfinCatalog(dependencies.prisma);
  const sessions = new JellyfinSessionRegistry();
  const playbackState = createPrismaJellyfinPlaybackState({ episode: (dependencies.prisma as any).episode, playbackProgress: (dependencies.prisma as any).playbackProgress });
  const version = options.version ?? '10.10.0';
  const identity = {
    serverId: options.serverId,
    serverName: options.serverName,
    lanAddress: options.lanAddress ?? '127.0.0.1',
    port: options.port ?? 8096,
    version,
    operatingSystem: process.platform,
  };
  const publicInfo = buildJellyfinPublicSystemInfo(identity);
  const systemInfo = buildJellyfinSystemInfo(identity);
  const serveArtwork = async (request: FastifyRequest, reply: FastifyReply) => { const params = request.params as { id: string; type: string }; const source = await resolveJellyfinArtworkSource(catalog, params.id, params.type); if (!source) return reply.code(404).send(); const proxied = await proxyJellyfinArtwork(source.url); if (!proxied.ok) return reply.code(proxied.status).send(); reply.header('Content-Type', proxied.contentType).header('Cache-Control', proxied.cacheControl); return reply.send(Buffer.from(proxied.body)); };
  const serveVideo = async (request: FastifyRequest, reply: FastifyReply) => { if (!dependencies.playbackService?.resolveStreamSource) return reply.code(503).send(); const target = decodePlaybackTarget((request.params as { id: string }).id); if (!target) return reply.code(404).send(); const source = await dependencies.playbackService.resolveStreamSource(target); return sendByteRangeStream(reply, source.filePath, request.headers.range); };
  const playbackInfo = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!dependencies.playbackService?.resolveStreamSource) return reply.code(503).send();
    const itemId = (request.params as { id: string }).id;
    if (!decodePlaybackTarget(itemId)) return emptyPlaybackInfo(itemId);
    try {
      const mediaSource = await buildDirectPlayMediaSource(itemId, dependencies.playbackService.resolveStreamSource);
      return { MediaSources: [mediaSource], PlaySessionId: itemId };
    } catch {
      return emptyPlaybackInfo(itemId);
    }
  };
  const withUserData = async (item: JellyfinCatalogItem): Promise<JellyfinCatalogItem & { UserData?: ReturnType<typeof sharedPlaybackStateToJellyfinUserData> }> => {
    const target = decodePlaybackTarget(item.Id);
    if (!target || !dependencies.playbackService?.getProgress) return item;
    const state = await dependencies.playbackService.getProgress({ ...target, userId: 'lan-default' });
    return { ...item, UserData: sharedPlaybackStateToJellyfinUserData(item.Id, state) };
  };
  const withUserDataResult = async (result: JellyfinCatalogQueryResult): Promise<JellyfinCatalogQueryResult> => ({
    ...result,
    Items: await Promise.all(result.Items.map(withUserData)),
  });
  app.get('/System/Info/Public', async () => publicInfo);
  app.get('/System/Info', async () => systemInfo);
  app.get('/System/Configuration', async () => ({ EnableRemoteAccess: true, CastReceiverApplications: [] }));
  app.get('/System/Ping', async (_request, reply) => reply.type('text/plain').send('Jellyfin'));
  app.post('/System/Ping', async (_request, reply) => reply.type('text/plain').send('Jellyfin'));
  app.get('/Branding/Configuration', async () => ({ LoginDisclaimer: '', CustomCss: '', SplashscreenEnabled: false }));
  app.get('/Users/Public', async () => [user(options.serverId)]);
  app.get('/Users', async () => [user(options.serverId)]);
  app.post('/Users/AuthenticateByName', async () => ({ User: user(options.serverId), AccessToken: `mediarr-${options.serverId}`, ServerId: options.serverId }));
  app.get('/Users/:id', async () => user(options.serverId));
  app.get('/UserViews', async () => ({ Items: views(), TotalRecordCount: 2, StartIndex: 0 }));
  app.get('/Users/:id/Views', async () => ({ Items: views(), TotalRecordCount: 2, StartIndex: 0 }));
  app.get('/Users/:id/GroupingOptions', async () => []);
  app.get('/Library/MediaFolders', async () => ({ Items: views(), TotalRecordCount: 2, StartIndex: 0 }));
  app.get('/Library/VirtualFolders', async () => []);
  app.post('/Library/Refresh', async () => ({ ok: true }));
  const latestItems = async () => {
    const episodes = await (dependencies.prisma as any).episode.findMany({
      orderBy: { airDateUtc: 'desc' },
      take: 16,
    });
    return Promise.all(episodes.map(mapEpisodeToItem).map(withUserData));
  };
  app.get('/Items', async (request) => withUserDataResult(await queryCatalog(catalog, catalogQuery(request.query as Record<string, unknown>))));
  app.get('/Users/:id/Items', async (request) => withUserDataResult(await queryCatalog(catalog, catalogQuery(request.query as Record<string, unknown>))));
  app.get('/Users/:id/Items/Latest', latestItems);
  app.get('/Items/Latest', latestItems);
  app.get('/Users/:userId/Items/:id', async (request, reply) => { const found = await getCatalogItem(catalog, (request.params as { id: string }).id); return found ? withUserData(found) : reply.code(404).send(); });
  app.get('/Items/:id', async (request, reply) => { const found = await getCatalogItem(catalog, (request.params as { id: string }).id); return found ? withUserData(found) : reply.code(404).send(); });
  app.get('/Items/:id/SpecialFeatures', async () => []);
  app.get('/Shows/:id/Seasons', async (request) => withUserDataResult(await querySeasons(catalog, (request.params as { id: string }).id, catalogQuery(request.query as Record<string, unknown>))));
  app.get('/Shows/:id/Episodes', async (request) => withUserDataResult(await queryEpisodesWithNavigation(catalog, (request.params as { id: string }).id, episodeNavigationQuery(request.query as Record<string, unknown>))));
  app.get('/Items/:id/Images/:type', serveArtwork);
  app.get('/Items/:id/Images/:type/:index', serveArtwork);
  app.get('/Items/:id/PlaybackInfo', playbackInfo);
  app.post('/Items/:id/PlaybackInfo', playbackInfo);
  app.get('/Videos/:id/stream', serveVideo);
  app.get('/Videos/:id/stream.:container', serveVideo);
  app.get('/Sessions', async () => sessions.list());
  app.post('/Sessions/Capabilities', async (request, reply) => { const body = request.body as Record<string, unknown>; const id = String(body.Id ?? request.headers['x-emby-device-id'] ?? 'unknown'); sessions.setCapabilities({ id, userId: 'lan-default' }, body); return reply.code(204).send(); });
  app.post('/Sessions/Capabilities/Full', async (request, reply) => { const body = request.body as Record<string, unknown>; const id = String(body.Id ?? request.headers['x-emby-device-id'] ?? 'unknown'); sessions.setCapabilities({ id, userId: 'lan-default' }, body); return reply.code(204).send(); });
  app.post('/Sessions/Playing', async (request, reply) => { const body = request.body as { ItemId?: string; PlaySessionId?: string; PositionTicks?: number; DeviceId?: string }; if (!body.ItemId) return reply.code(204).send(); sessions.startPlayback(sessionIdentity(body.DeviceId), { itemId: body.ItemId, ...(body.PlaySessionId === undefined ? {} : { playSessionId: body.PlaySessionId }), ...(body.PositionTicks === undefined ? {} : { positionTicks: body.PositionTicks }) }); return reply.code(204).send(); });
  app.post('/Sessions/Playing/Stopped', async (request, reply) => { const body = request.body as { PositionTicks?: number; DeviceId?: string }; sessions.stopPlayback(sessionIdentity(body.DeviceId), { ...(body.PositionTicks === undefined ? {} : { positionTicks: body.PositionTicks }) }); return reply.code(204).send(); });
  app.post('/Sessions/Playing/Progress', async (request, reply) => { if (!dependencies.playbackService?.recordHeartbeat) return reply.code(503).send(); const body = request.body as any; const heartbeat = jellyfinProgressToHeartbeat(body); if (!heartbeat) return reply.code(400).send(); sessions.updatePlayback(sessionIdentity(body.DeviceId), { itemId: body.ItemId, playSessionId: body.PlaySessionId, positionTicks: body.PositionTicks }); await dependencies.playbackService.recordHeartbeat(heartbeat); return reply.code(204).send(); });
  app.get('/Users/:id/Items/Resume', async () => continueWatchingToJellyfinResume(await dependencies.playbackService?.getContinueWatching?.(20) ?? []));
  app.get('/UserItems/Resume', async () => continueWatchingToJellyfinResume(await dependencies.playbackService?.getContinueWatching?.(20) ?? []));
  app.post('/UserPlayedItems/:id', async (request, reply) => {
    if (!dependencies.playbackService?.markWatched) return reply.code(503).send();
    const itemId = (request.params as { id: string }).id;
    const item = await getCatalogItem(catalog, itemId);
    const target = decodePlaybackTarget(itemId);
    if (!item || !target) return reply.code(404).send();
    const state = await dependencies.playbackService.markWatched({ ...target, userId: 'lan-default' });
    return sharedPlaybackStateToJellyfinUserData(itemId, state);
  });
  app.delete('/UserPlayedItems/:id', async (request, reply) => {
    if (!dependencies.playbackService?.markUnwatched) return reply.code(503).send();
    const itemId = (request.params as { id: string }).id;
    const item = await getCatalogItem(catalog, itemId);
    const target = decodePlaybackTarget(itemId);
    if (!item || !target) return reply.code(404).send();
    const state = await dependencies.playbackService.markUnwatched({ ...target, userId: 'lan-default' });
    return sharedPlaybackStateToJellyfinUserData(itemId, state);
  });
  app.get('/Shows/NextUp', async (request) => {
    const query = request.query as { SeriesId?: string; Limit?: string };
    const options = nextUpOptions(query);
    if (!options) return { Items: [], TotalRecordCount: 0, StartIndex: 0 };
    const items = await derivePrismaNextUpCatalogItems(playbackState, options);
    return { Items: await Promise.all(items.map(withUserData)), TotalRecordCount: items.length, StartIndex: 0 };
  });
  app.get('/DisplayPreferences/:id', async (request) => ({
    Id: (request.params as { id: string }).id,
    Client: 'emby',
    CustomPrefs: {},
    RememberIndexing: false,
    PrimaryImageHeight: 250,
    PrimaryImageWidth: 250,
    ScrollDirection: 'Horizontal',
    ShowBackdrop: true,
    RememberSorting: false,
    SortOrder: 'Ascending',
    ShowSidebar: false,
  }));
  app.post('/DisplayPreferences/:id', async (_request, reply) => reply.code(204).send());
  app.post('/ClientLog/Document', async (_request, reply) => reply.code(204).send());
  return app;
}

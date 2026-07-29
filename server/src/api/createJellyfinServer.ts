import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import type { ApiDependencies } from './types';
import { decodeJellyfinId, encodeJellyfinId, JELLYFIN_MOVIE_VIEW_ID, JELLYFIN_TV_VIEW_ID } from '../jellyfin/ids';
import { getCatalogItem, queryCatalog, queryEpisodesWithNavigation, queryLatestCatalog, querySeasons, type CatalogQuery, type EpisodeQueryOptions, type JellyfinCatalogItem, type JellyfinCatalogQueryResult } from '../jellyfin/catalog';
import { createPrismaJellyfinCatalog } from '../jellyfin/prismaCatalog';
import { buildDirectPlayMediaSource, decodePlaybackTarget } from '../jellyfin/playback';
import {
  extractJellyfinSessionIdentity,
  jellyfinSessionToDto,
  JellyfinSessionRegistry,
} from '../jellyfin/sessions';
import { continueWatchingToJellyfinResume, jellyfinProgressToHeartbeat } from '../jellyfin/playbackState';
import { proxyJellyfinArtwork, resolveJellyfinArtworkSource } from '../jellyfin/artwork';
import { createPrismaJellyfinPlaybackState, derivePrismaNextUpCatalogPage, type NextUpCatalogPageOptions } from '../jellyfin/prismaPlaybackState';
import { buildJellyfinPublicSystemInfo, buildJellyfinSystemInfo, buildTrustedLanUserDto } from '../jellyfin/compatibilityDtos';
import { sharedPlaybackStateToJellyfinUserData } from '../jellyfin/userData';
import { createJellyfinReferenceStreamHandler, jellyfinBrowserEntryHandler, jellyfinSocketKeepAliveResponse } from '../jellyfin/referenceSurface';

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
  const pick = (upper: string, lower: string): unknown => query[upper] ?? query[lower];
  const scalar = (value: unknown): string | number | boolean | undefined => {
    const entry = Array.isArray(value) ? value[0] : value;
    return typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean'
      ? entry
      : undefined;
  };
  const list = (value: unknown): string | readonly string[] | undefined => {
    if (typeof value === 'string') return value;
    return Array.isArray(value) && value.every(entry => typeof entry === 'string')
      ? value
      : undefined;
  };
  const normalized: CatalogQuery = {};
  const parentId = scalar(pick('ParentId', 'parentId'));
  const startIndex = scalar(pick('StartIndex', 'startIndex'));
  const limit = scalar(pick('Limit', 'limit'));
  const sortBy = list(pick('SortBy', 'sortBy'));
  const sortOrder = scalar(pick('SortOrder', 'sortOrder'));
  const includeItemTypes = list(pick('IncludeItemTypes', 'includeItemTypes'));
  const excludeItemTypes = list(pick('ExcludeItemTypes', 'excludeItemTypes'));
  const searchTerm = scalar(pick('SearchTerm', 'searchTerm'));
  const recursive = scalar(pick('Recursive', 'recursive'));

  if (typeof parentId === 'string') normalized.parentId = parentId;
  if (typeof startIndex === 'string' || typeof startIndex === 'number') normalized.startIndex = startIndex;
  if (typeof limit === 'string' || typeof limit === 'number') normalized.limit = limit;
  if (sortBy) normalized.sortBy = sortBy;
  if (typeof sortOrder === 'string') normalized.sortOrder = sortOrder;
  if (includeItemTypes) normalized.includeItemTypes = includeItemTypes;
  if (excludeItemTypes) normalized.excludeItemTypes = excludeItemTypes;
  if (typeof searchTerm === 'string') normalized.searchTerm = searchTerm;
  if (recursive !== undefined) normalized.recursive = recursive;

  return normalized;
}

function requestRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function jellyfinSessionRequest(request: FastifyRequest) {
  const body = requestRecord(request.body);
  const query = requestRecord(request.query);
  return {
    body,
    query,
    capabilities: { ...query, ...body },
    identity: extractJellyfinSessionIdentity({
      headers: request.headers,
      body,
      query,
      userId: 'lan-default',
    }),
  };
}

function nextUpOptions(query: Record<string, unknown>): NextUpCatalogPageOptions | null {
  const pick = (upper: string, lower: string) => query[upper] ?? query[lower];
  const seriesId = pick('SeriesId', 'seriesId');
  if (seriesId !== undefined && typeof seriesId !== 'string') return null;
  const decoded = typeof seriesId === 'string' && seriesId.trim()
    ? decodeJellyfinId(seriesId)
    : null;
  if (typeof seriesId === 'string' && seriesId.trim() && decoded?.kind !== 'series') return null;
  const startIndex = pick('StartIndex', 'startIndex');
  const limit = pick('Limit', 'limit');
  return {
    userId: 'lan-default',
    ...(decoded?.kind === 'series' ? { seriesId: decoded.id } : {}),
    ...(typeof startIndex === 'string' || typeof startIndex === 'number' ? { startIndex } : {}),
    ...(typeof limit === 'string' || typeof limit === 'number' ? { limit } : {}),
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

export function createJellyfinServer(dependencies: Pick<ApiDependencies, 'prisma' | 'playbackService'>, options: JellyfinServerOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  const catalog = createPrismaJellyfinCatalog(dependencies.prisma);
  const sessions = new JellyfinSessionRegistry();
  app.register(websocket);
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
  const latestItems = async (request: FastifyRequest) => {
    const items = await queryLatestCatalog(catalog, catalogQuery(request.query as Record<string, unknown>));
    return Promise.all(items.map(withUserData));
  };
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
  const directStream = createJellyfinReferenceStreamHandler(dependencies.playbackService);
  app.get('/Videos/:id/stream', directStream);
  app.get('/Videos/:id/stream.:container', directStream);
  app.get('/Audio/:id/stream', directStream);
  app.get('/Audio/:id/stream.:container', directStream);
  app.get('/Items/:id/Download', directStream);
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
  app.get('/', jellyfinBrowserEntryHandler);
  app.get('/web', jellyfinBrowserEntryHandler);
  app.get('/web/', jellyfinBrowserEntryHandler);
  app.register(async socketRoutes => {
    socketRoutes.get('/socket', { websocket: true }, (socket) => {
      socket.on('message', (raw: { toString(): string }) => {
        const response = jellyfinSocketKeepAliveResponse(raw.toString());
        if (response) socket.send(response);
      });
    });
  });
  app.get('/Sessions', async () => sessions.list().map(session => jellyfinSessionToDto(session, { userId: COMPAT_USER_ID, userName: 'Mediarr' })));
  const setSessionCapabilities = async (request: FastifyRequest, reply: FastifyReply) => {
    const details = jellyfinSessionRequest(request);
    sessions.setCapabilities(details.identity, details.capabilities);
    return reply.code(204).send();
  };
  app.post('/Sessions/Capabilities', setSessionCapabilities);
  app.post('/Sessions/Capabilities/Full', setSessionCapabilities);
  app.post('/Sessions/Playing', async (request, reply) => {
    const details = jellyfinSessionRequest(request);
    const body = details.body as { ItemId?: unknown; PlaySessionId?: unknown; PositionTicks?: unknown };
    if (typeof body.ItemId !== 'string' || body.ItemId.trim().length === 0) {
      return reply.code(204).send();
    }
    sessions.startPlayback(details.identity, {
      itemId: body.ItemId,
      ...(typeof body.PlaySessionId === 'string' ? { playSessionId: body.PlaySessionId } : {}),
      ...(typeof body.PositionTicks === 'number' ? { positionTicks: body.PositionTicks } : {}),
    });
    return reply.code(204).send();
  });
  app.post('/Sessions/Playing/Stopped', async (request, reply) => {
    const details = jellyfinSessionRequest(request);
    const body = details.body as { PositionTicks?: unknown };
    const heartbeat = jellyfinProgressToHeartbeat(details.body);
    if (heartbeat) {
      if (!dependencies.playbackService?.recordHeartbeat) return reply.code(503).send();
      await dependencies.playbackService.recordHeartbeat(heartbeat);
    }
    sessions.stopPlayback(details.identity, {
      ...(typeof body.PositionTicks === 'number' ? { positionTicks: body.PositionTicks } : {}),
    });
    return reply.code(204).send();
  });
  app.post('/Sessions/Playing/Progress', async (request, reply) => {
    if (!dependencies.playbackService?.recordHeartbeat) return reply.code(503).send();
    const details = jellyfinSessionRequest(request);
    const body = details.body as { ItemId?: unknown; PlaySessionId?: unknown; PositionTicks?: unknown };
    const heartbeat = jellyfinProgressToHeartbeat(details.body);
    if (!heartbeat) return reply.code(400).send();
    sessions.updatePlayback(details.identity, {
      ...(typeof body.ItemId === 'string' ? { itemId: body.ItemId } : {}),
      ...(typeof body.PlaySessionId === 'string' ? { playSessionId: body.PlaySessionId } : {}),
      ...(typeof body.PositionTicks === 'number' ? { positionTicks: body.PositionTicks } : {}),
    });
    await dependencies.playbackService.recordHeartbeat(heartbeat);
    return reply.code(204).send();
  });
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
    const options = nextUpOptions(request.query as Record<string, unknown>);
    if (!options) return { Items: [], TotalRecordCount: 0, StartIndex: 0 };
    const page = await derivePrismaNextUpCatalogPage(playbackState, options);
    return { ...page, Items: await Promise.all(page.Items.map(withUserData)) };
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

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import type { ApiDependencies } from './types';
import { decodeJellyfinId, encodeJellyfinId, JELLYFIN_MOVIE_VIEW_ID, JELLYFIN_TV_VIEW_ID } from '../jellyfin/ids';
import { getCatalogItem, queryCatalog, queryEpisodes, querySeasons, type CatalogQuery, type JellyfinCatalogRepository } from '../jellyfin/catalog';
import { createPrismaJellyfinCatalog } from '../jellyfin/prismaCatalog';
import { buildDirectPlayMediaSource, decodePlaybackTarget } from '../jellyfin/playback';
import { sendByteRangeStream } from './utils/byteRangeStreaming';
import { JellyfinSessionRegistry } from '../jellyfin/sessions';
import { continueWatchingToJellyfinResume, jellyfinProgressToHeartbeat, type NextUpOptions } from '../jellyfin/playbackState';
import { proxyJellyfinArtwork, resolveJellyfinArtworkSource } from '../jellyfin/artwork';
import { createPrismaJellyfinPlaybackState, derivePrismaNextUpCatalogItems } from '../jellyfin/prismaPlaybackState';

export interface JellyfinServerOptions {
  serverId: string;
  serverName: string;
  version?: string;
}

const COMPAT_USER_ID = '4d656469-6172-7200-0000-000000000001';

function user(serverId: string) {
  return { Id: COMPAT_USER_ID, Name: 'Mediarr', ServerId: serverId, HasPassword: false, HasConfiguredPassword: false, EnableAutoLogin: true };
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

function nextUpOptions(query: { SeriesId?: string; Limit?: string }): NextUpOptions {
  const decoded = query.SeriesId ? decodeJellyfinId(query.SeriesId) : null;
  return {
    userId: 'lan-default',
    ...(decoded?.kind === 'series' ? { seriesId: decoded.id } : {}),
    ...(query.Limit ? { limit: Number(query.Limit) } : {}),
  };
}

/** Creates a deliberately separate Jellyfin-shaped HTTP surface sharing Mediarr dependencies. */
export function createJellyfinServer(dependencies: Pick<ApiDependencies, 'prisma' | 'playbackService'>, options: JellyfinServerOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  const catalog = createPrismaJellyfinCatalog(dependencies.prisma);
  const sessions = new JellyfinSessionRegistry();
  const playbackState = createPrismaJellyfinPlaybackState({ episode: (dependencies.prisma as any).episode, playbackProgress: (dependencies.prisma as any).playbackProgress });
  const version = options.version ?? '10.10.0';
  const info = { LocalAddress: '0.0.0.0', ServerName: options.serverName, Version: version, Id: options.serverId, ProductName: 'Mediarr', OperatingSystem: process.platform };
  const serveArtwork = async (request: FastifyRequest, reply: FastifyReply) => { const params = request.params as { id: string; type: string }; const source = await resolveJellyfinArtworkSource(catalog, params.id, params.type); if (!source) return reply.code(404).send(); const proxied = await proxyJellyfinArtwork(source.url); if (!proxied.ok) return reply.code(proxied.status).send(); reply.header('Content-Type', proxied.contentType).header('Cache-Control', proxied.cacheControl); return reply.send(Buffer.from(proxied.body)); };
  const serveVideo = async (request: FastifyRequest, reply: FastifyReply) => { if (!dependencies.playbackService?.resolveStreamSource) return reply.code(503).send(); const target = decodePlaybackTarget((request.params as { id: string }).id); if (!target) return reply.code(404).send(); const source = await dependencies.playbackService.resolveStreamSource(target); return sendByteRangeStream(reply, source.filePath, request.headers.range); };
  app.get('/System/Info/Public', async () => ({ ...info, StartupWizardCompleted: true }));
  app.get('/System/Info', async () => info);
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
  app.get('/Items', async (request) => queryCatalog(catalog, catalogQuery(request.query as Record<string, unknown>)));
  app.get('/Users/:id/Items', async (request) => queryCatalog(catalog, catalogQuery(request.query as Record<string, unknown>)));
  app.get('/Users/:userId/Items/:id', async (request, reply) => { const found = await getCatalogItem(catalog, (request.params as { id: string }).id); return found ?? reply.code(404).send(); });
  app.get('/Items/:id', async (request, reply) => { const found = await getCatalogItem(catalog, (request.params as { id: string }).id); return found ?? reply.code(404).send(); });
  app.get('/Items/:id/SpecialFeatures', async () => []);
  app.get('/Shows/:id/Seasons', async (request) => querySeasons(catalog, (request.params as { id: string }).id, catalogQuery(request.query as Record<string, unknown>)));
  app.get('/Shows/:id/Episodes', async (request) => queryEpisodes(catalog, (request.params as { id: string }).id, catalogQuery(request.query as Record<string, unknown>)));
  app.get('/Items/:id/Images/:type', serveArtwork);
  app.get('/Items/:id/Images/:type/:index', serveArtwork);
  app.get('/Items/:id/PlaybackInfo', async (request, reply) => { if (!dependencies.playbackService?.resolveStreamSource) return reply.code(503).send(); const id = (request.params as { id: string }).id; const mediaSource = await buildDirectPlayMediaSource(id, dependencies.playbackService.resolveStreamSource); return { MediaSources: [mediaSource], PlaySessionId: id }; });
  app.post('/Items/:id/PlaybackInfo', async (request, reply) => { if (!dependencies.playbackService?.resolveStreamSource) return reply.code(503).send(); const id = (request.params as { id: string }).id; const mediaSource = await buildDirectPlayMediaSource(id, dependencies.playbackService.resolveStreamSource); return { MediaSources: [mediaSource], PlaySessionId: id }; });
  app.get('/Videos/:id/stream', serveVideo);
  app.get('/Videos/:id/stream.:container', serveVideo);
  app.get('/Sessions', async () => sessions.list());
  app.post('/Sessions/Capabilities', async (request, reply) => { const body = request.body as Record<string, unknown>; const id = String(body.Id ?? request.headers['x-emby-device-id'] ?? 'unknown'); sessions.setCapabilities({ id, userId: 'lan-default' }, body); return reply.code(204).send(); });
  app.post('/Sessions/Capabilities/Full', async (request, reply) => { const body = request.body as Record<string, unknown>; const id = String(body.Id ?? request.headers['x-emby-device-id'] ?? 'unknown'); sessions.setCapabilities({ id, userId: 'lan-default' }, body); return reply.code(204).send(); });
  app.post('/Sessions/Playing', async (request, reply) => { const body = request.body as { ItemId?: string; PlaySessionId?: string; PositionTicks?: number; DeviceId?: string }; sessions.startPlayback(sessionIdentity(body.DeviceId), { itemId: body.ItemId ?? '', ...(body.PlaySessionId === undefined ? {} : { playSessionId: body.PlaySessionId }), ...(body.PositionTicks === undefined ? {} : { positionTicks: body.PositionTicks }) }); return reply.code(204).send(); });
  app.post('/Sessions/Playing/Stopped', async (request, reply) => { const body = request.body as { PositionTicks?: number; DeviceId?: string }; sessions.stopPlayback(sessionIdentity(body.DeviceId), { ...(body.PositionTicks === undefined ? {} : { positionTicks: body.PositionTicks }) }); return reply.code(204).send(); });
  app.post('/Sessions/Playing/Progress', async (request, reply) => { if (!dependencies.playbackService?.recordHeartbeat) return reply.code(503).send(); const body = request.body as any; const heartbeat = jellyfinProgressToHeartbeat(body); if (!heartbeat) return reply.code(400).send(); sessions.updatePlayback(sessionIdentity(body.DeviceId), { itemId: body.ItemId, playSessionId: body.PlaySessionId, positionTicks: body.PositionTicks }); await dependencies.playbackService.recordHeartbeat(heartbeat); return reply.code(204).send(); });
  app.get('/Users/:id/Items/Resume', async () => continueWatchingToJellyfinResume(await dependencies.playbackService?.getContinueWatching?.(20) ?? []));
  app.get('/UserItems/Resume', async () => continueWatchingToJellyfinResume(await dependencies.playbackService?.getContinueWatching?.(20) ?? []));
  app.post('/UserPlayedItems/:id', async (request, reply) => { if (!dependencies.playbackService?.markWatched) return reply.code(503).send(); const target = decodePlaybackTarget((request.params as { id: string }).id); if (!target) return reply.code(404).send(); await dependencies.playbackService.markWatched({ ...target, userId: 'lan-default' }); return reply.code(204).send(); });
  app.get('/Shows/NextUp', async (request) => { const query = request.query as { SeriesId?: string; Limit?: string }; const items = await derivePrismaNextUpCatalogItems(playbackState, nextUpOptions(query)); return { Items: items, TotalRecordCount: items.length, StartIndex: 0 }; });
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

import type {
  FastifyReply,
  FastifyRequest,
  RouteHandlerMethod,
} from 'fastify';
import { sendByteRangeStream } from '../api/utils/byteRangeStreaming';
import { NotFoundError } from '../errors/domainErrors';
import { decodePlaybackTarget } from './playback';

interface ReferenceStreamSource {
  filePath: string;
}

export interface JellyfinReferencePlaybackService {
  resolveStreamSource: (target: {
    mediaType: 'MOVIE' | 'EPISODE';
    mediaId: number;
  }) => Promise<ReferenceStreamSource>;
}

interface ReferenceStreamParams {
  id: string;
  container?: string;
}


function isMissingPlaybackSource(error: unknown): boolean {
  if (error instanceof NotFoundError) return true;
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return error.code === 'ENOENT' || error.code === 'ENOTDIR';
}
/**
 * Creates the shared handler used by Jellyfin's Audio stream and Download
 * aliases. It resolves the same Mediarr movie/episode source as the Video
 * route and delegates all 200/206/416 behavior to the one range implementation.
 */
export function createJellyfinReferenceStreamHandler(
  playbackService?: JellyfinReferencePlaybackService,
): RouteHandlerMethod {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!playbackService) {
      return reply.code(503).send();
    }

    const { id } = request.params as ReferenceStreamParams;
    const target = decodePlaybackTarget(id);
    if (!target) {
      return reply.code(404).send();
    }

    try {
      const source = await playbackService.resolveStreamSource(target);
      return await sendByteRangeStream(reply, source.filePath, request.headers.range);
    } catch (error) {
      if (isMissingPlaybackSource(error)) {
        return reply.code(404).send();
      }
      throw error;
    }
  };
}

export const JELLYFIN_BROWSER_ENTRY_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Mediarr</title>
  </head>
  <body>
    <main>
      <h1>Mediarr</h1>
      <p>This server provides a Jellyfin-compatible trusted-LAN media surface.</p>
    </main>
  </body>
</html>`;

/** Serves the same stable entry document from `/`, `/web`, and `/web/`. */
export const jellyfinBrowserEntryHandler: RouteHandlerMethod = async (
  _request,
  reply,
) => reply
  .type('text/html; charset=utf-8')
  .send(JELLYFIN_BROWSER_ENTRY_HTML);

/**
 * Implements the message-level part of Jellyfin's minimal socket contract.
 * Transport registration is intentionally separate so this helper remains
 * independent of a particular Fastify WebSocket plugin.
 */
export function jellyfinSocketKeepAliveResponse(message: string): string | null {
  try {
    const parsed: unknown = JSON.parse(message);
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'MessageType' in parsed
      && parsed.MessageType === 'KeepAlive'
    ) {
      return JSON.stringify({ MessageType: 'KeepAlive' });
    }
  } catch {
    return null;
  }

  return null;
}

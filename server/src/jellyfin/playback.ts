import path from 'node:path';
import type { PlaybackTarget } from '../contracts/playback';
import { decodeJellyfinId } from './ids';

export interface ResolvedPlaybackStreamSource {
  mediaType: 'MOVIE' | 'EPISODE';
  mediaId: number;
  title: string;
  filePath: string;
}

export type ResolvePlaybackStreamSource = (
  target: PlaybackTarget,
) => ResolvedPlaybackStreamSource | Promise<ResolvedPlaybackStreamSource>;

export interface JellyfinDirectPlayMediaSource {
  Id: string;
  Name: string;
  Path: string;
  Protocol: 'File';
  Type: 'Default';
  Container: string;
  SupportsDirectPlay: true;
  SupportsDirectStream: true;
  SupportsTranscoding: false;
  IsRemote: false;
  ReadAtNativeFramerate: false;
  IgnoreDts: false;
  IgnoreIndex: false;
  GenPtsInput: false;
  IsInfiniteStream: false;
  RequiresOpening: false;
  RequiresClosing: false;
  RequiresLooping: false;
  SupportsProbing: false;
  HasSegments: false;
  MediaStreams: [];
  DirectStreamUrl: string;
}

const CONTAINER_ALIASES: Readonly<Record<string, string>> = {
  m4v: 'mp4',
};

/** Signals that a stable Jellyfin id does not identify playable Mediarr media. */
export class UnsupportedJellyfinPlaybackItemError extends Error {
  constructor(itemId: string) {
    super(`Unsupported Jellyfin playback item id: ${itemId}`);
    this.name = 'UnsupportedJellyfinPlaybackItemError';
  }
}

/**
 * Decodes only stable movie and episode ids into Mediarr's existing playback
 * target contract. Folders, views, and foreign ids are intentionally rejected.
 */
export function decodePlaybackTarget(itemId: string): PlaybackTarget | null {
  const decoded = decodeJellyfinId(itemId);
  if (decoded?.kind === 'movie') {
    return {
      mediaType: 'MOVIE',
      mediaId: decoded.id,
    };
  }
  if (decoded?.kind === 'episode') {
    return {
      mediaType: 'EPISODE',
      mediaId: decoded.id,
    };
  }
  return null;
}

function resolveContainer(filePath: string): string {
  const extension = path.extname(filePath).slice(1).trim().toLowerCase();
  if (!extension) {
    throw new Error(`Jellyfin direct play requires a playable file extension: ${filePath}`);
  }
  return CONTAINER_ALIASES[extension] ?? extension;
}

/**
 * Resolves a stable Jellyfin item through PlaybackService and maps it to a
 * direct-play-only MediaSource. Transcoding remains deliberately unavailable.
 */
export async function buildDirectPlayMediaSource(
  itemId: string,
  resolveStreamSource: ResolvePlaybackStreamSource,
): Promise<JellyfinDirectPlayMediaSource> {
  const target = decodePlaybackTarget(itemId);
  if (!target) {
    throw new UnsupportedJellyfinPlaybackItemError(itemId);
  }

  const source = await resolveStreamSource(target);
  if (
    source.mediaType !== target.mediaType
    || source.mediaId !== target.mediaId
  ) {
    throw new Error(
      `Resolved playback source did not match requested item: ${itemId}`,
    );
  }

  const container = resolveContainer(source.filePath);

  return {
    Id: itemId,
    Name: source.title,
    Path: source.filePath,
    Protocol: 'File',
    Type: 'Default',
    Container: container,
    SupportsDirectPlay: true,
    SupportsDirectStream: true,
    SupportsTranscoding: false,
    IsRemote: false,
    ReadAtNativeFramerate: false,
    IgnoreDts: false,
    IgnoreIndex: false,
    GenPtsInput: false,
    IsInfiniteStream: false,
    RequiresOpening: false,
    RequiresClosing: false,
    RequiresLooping: false,
    SupportsProbing: false,
    HasSegments: false,
    MediaStreams: [],
    DirectStreamUrl: `/Videos/${itemId}/stream`,
  };
}

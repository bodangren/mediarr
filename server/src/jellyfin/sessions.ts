/** Jellyfin represents all playback time in 100-nanosecond ticks. */
export const JELLYFIN_TICKS_PER_SECOND = 10_000_000;

export interface JellyfinSessionIdentity {
  id: string;
  userId: string;
  deviceId?: string;
  deviceName?: string;
  client?: string;
  applicationVersion?: string;
}

export interface JellyfinPlaybackUpdate {
  itemId?: string;
  playSessionId?: string;
  positionTicks?: number;
}

export interface JellyfinSession {
  id: string;
  userId: string;
  deviceId: string | undefined;
  deviceName: string | undefined;
  client: string | undefined;
  applicationVersion: string | undefined;
  capabilities: Record<string, unknown> | undefined;
  nowPlayingItemId: string | undefined;
  playSessionId: string | undefined;
  positionTicks: number | undefined;
  isPlaying: boolean;
  lastActivityAt: Date;
}

export interface JellyfinSessionRegistryOptions {
  now?: () => Date;
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
}

function assertTickValue(value: number): void {
  assertNonNegativeFinite(value, 'Jellyfin ticks');
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('Jellyfin ticks must be a safe integer');
  }
}

function requireIdentifier(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new RangeError(`${label} must not be empty`);
  }
  return normalized;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function cloneCapabilities(
  capabilities: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return capabilities === undefined ? undefined : structuredClone(capabilities);
}

function cloneSession(session: JellyfinSession): JellyfinSession {
  return {
    ...session,
    capabilities: cloneCapabilities(session.capabilities),
    lastActivityAt: new Date(session.lastActivityAt),
  };
}

/** Converts Mediarr's seconds-based playback position to Jellyfin ticks. */
export function secondsToTicks(seconds: number): number {
  assertNonNegativeFinite(seconds, 'Seconds');
  const ticks = Math.round(seconds * JELLYFIN_TICKS_PER_SECOND);
  assertTickValue(ticks);
  return ticks;
}

/** Converts Jellyfin's 100-nanosecond ticks to Mediarr's seconds. */
export function ticksToSeconds(ticks: number): number {
  assertTickValue(ticks);
  return ticks / JELLYFIN_TICKS_PER_SECOND;
}

/**
 * Tracks transient client/session metadata required by Jellyfin's sessions API.
 * Playback progress remains durable in PlaybackService; this registry is only
 * live connection state and is intentionally reset at process restart.
 */
export class JellyfinSessionRegistry {
  private readonly sessions = new Map<string, JellyfinSession>();
  private readonly now: () => Date;

  constructor(options: JellyfinSessionRegistryOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  touch(identity: JellyfinSessionIdentity): JellyfinSession {
    const id = requireIdentifier(identity.id, 'Session id');
    const userId = requireIdentifier(identity.userId, 'User id');
    const existing = this.sessions.get(id);
    const lastActivityAt = this.readCurrentTime();

    const session: JellyfinSession = {
      id,
      userId,
      deviceId: identity.deviceId === undefined
        ? existing?.deviceId
        : normalizeOptionalString(identity.deviceId),
      deviceName: identity.deviceName === undefined
        ? existing?.deviceName
        : normalizeOptionalString(identity.deviceName),
      client: identity.client === undefined
        ? existing?.client
        : normalizeOptionalString(identity.client),
      applicationVersion: identity.applicationVersion === undefined
        ? existing?.applicationVersion
        : normalizeOptionalString(identity.applicationVersion),
      capabilities: cloneCapabilities(existing?.capabilities),
      nowPlayingItemId: existing?.nowPlayingItemId,
      playSessionId: existing?.playSessionId,
      positionTicks: existing?.positionTicks,
      isPlaying: existing?.isPlaying ?? false,
      lastActivityAt,
    };

    this.sessions.set(id, session);
    return cloneSession(session);
  }

  setCapabilities(
    identity: JellyfinSessionIdentity,
    capabilities: Record<string, unknown>,
  ): JellyfinSession {
    const session = this.getMutableSession(identity);
    session.capabilities = cloneCapabilities(capabilities);
    return cloneSession(session);
  }

  startPlayback(
    identity: JellyfinSessionIdentity,
    update: Required<Pick<JellyfinPlaybackUpdate, 'itemId'>> & JellyfinPlaybackUpdate,
  ): JellyfinSession {
    const itemId = requireIdentifier(update.itemId, 'Item id');
    const positionTicks = this.normalizePlaybackPosition(update.positionTicks);
    const session = this.getMutableSession(identity);
    session.nowPlayingItemId = itemId;
    session.playSessionId = normalizeOptionalString(update.playSessionId);
    session.positionTicks = positionTicks;
    session.isPlaying = true;
    return cloneSession(session);
  }

  updatePlayback(identity: JellyfinSessionIdentity, update: JellyfinPlaybackUpdate): JellyfinSession {
    const positionTicks = this.normalizePlaybackPosition(update.positionTicks);
    const session = this.getMutableSession(identity);
    if (update.itemId !== undefined) {
      session.nowPlayingItemId = requireIdentifier(update.itemId, 'Item id');
    }
    if (update.playSessionId !== undefined) {
      session.playSessionId = normalizeOptionalString(update.playSessionId);
    }
    if (positionTicks !== undefined) {
      session.positionTicks = positionTicks;
    }
    session.isPlaying = true;
    return cloneSession(session);
  }

  stopPlayback(identity: JellyfinSessionIdentity, update: JellyfinPlaybackUpdate = {}): JellyfinSession {
    const positionTicks = this.normalizePlaybackPosition(update.positionTicks);
    const session = this.getMutableSession(identity);
    if (positionTicks !== undefined) {
      session.positionTicks = positionTicks;
    }
    session.nowPlayingItemId = undefined;
    session.playSessionId = undefined;
    session.isPlaying = false;
    return cloneSession(session);
  }

  get(id: string): JellyfinSession | undefined {
    const session = this.sessions.get(id.trim());
    return session === undefined ? undefined : cloneSession(session);
  }

  list(): JellyfinSession[] {
    return Array.from(this.sessions.values())
      .sort((left, right) => {
        const activityDelta = right.lastActivityAt.getTime() - left.lastActivityAt.getTime();
        return activityDelta === 0 ? left.id.localeCompare(right.id) : activityDelta;
      })
      .map(cloneSession);
  }

  private getMutableSession(identity: JellyfinSessionIdentity): JellyfinSession {
    const touched = this.touch(identity);
    const session = this.sessions.get(touched.id);
    if (!session) {
      throw new Error('Jellyfin session was not retained after touch');
    }
    return session;
  }

  private normalizePlaybackPosition(positionTicks: number | undefined): number | undefined {
    if (positionTicks === undefined) {
      return undefined;
    }
    assertTickValue(positionTicks);
    return positionTicks;
  }

  private readCurrentTime(): Date {
    const now = this.now();
    if (Number.isNaN(now.getTime())) {
      throw new RangeError('Session clock returned an invalid date');
    }
    return new Date(now);
  }
}

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
    session.capabilities = {
      ...(cloneCapabilities(session.capabilities) ?? {}),
      ...(cloneCapabilities(capabilities) ?? {}),
    };
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

export interface JellyfinSessionRequestIdentitySource {
  headers?: unknown;
  body?: unknown;
  query?: unknown;
  userId?: string;
}

export interface JellyfinSessionDtoOptions {
  userId: string;
  userName: string;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizedString(value: unknown): string | undefined {
  if (Array.isArray(value)) return normalizedString(value[0]);
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readCaseInsensitive(
  source: Record<string, unknown>,
  names: readonly string[],
): string | undefined {
  const accepted = new Set(names.map(name => name.toLowerCase()));
  for (const [key, value] of Object.entries(source)) {
    if (!accepted.has(key.toLowerCase())) continue;
    const normalized = normalizedString(value);
    if (normalized !== undefined) return normalized;
  }
  return undefined;
}

function readFirst(
  sources: readonly Record<string, unknown>[],
  names: readonly string[],
): string | undefined {
  for (const source of sources) {
    const value = readCaseInsensitive(source, names);
    if (value !== undefined) return value;
  }
  return undefined;
}

function parseEmbyAuthorization(value: string | undefined): Record<string, unknown> {
  if (value === undefined) return {};
  const parsed: Record<string, unknown> = {};
  const matcher = /([A-Za-z][A-Za-z0-9_-]*)\s*=\s*"((?:\\.|[^"])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(value)) !== null) {
    const key = match[1];
    const raw = match[2];
    if (key !== undefined && raw !== undefined) {
      parsed[key] = raw.replace(/\\"/g, '"');
    }
  }
  return parsed;
}

/**
 * Extracts one stable Jellyfin client identity from body, query, direct
 * X-Emby headers, or the standard X-Emby-Authorization header.
 */
export function extractJellyfinSessionIdentity(
  input: JellyfinSessionRequestIdentitySource,
): JellyfinSessionIdentity {
  const body = recordValue(input.body);
  const query = recordValue(input.query);
  const headers = recordValue(input.headers);
  const directHeaders: Record<string, unknown> = {
    DeviceId: readCaseInsensitive(headers, ['x-emby-device-id']),
    DeviceName: readCaseInsensitive(headers, ['x-emby-device-name']),
    Client: readCaseInsensitive(headers, ['x-emby-client']),
    Version: readCaseInsensitive(headers, ['x-emby-client-version']),
  };
  const authorization = parseEmbyAuthorization(
    readCaseInsensitive(headers, ['x-emby-authorization']),
  );
  const sources = [body, query, directHeaders, authorization];
  const deviceId = readFirst(sources, ['DeviceId']);
  const explicitId = readFirst([body, query], ['Id']);
  const id = deviceId ?? explicitId ?? 'unknown';
  const resolvedDeviceId = deviceId ?? explicitId;
  const deviceName = readFirst(sources, ['DeviceName', 'Device']);
  const client = readFirst(sources, ['Client']);
  const applicationVersion = readFirst(sources, ['ApplicationVersion', 'Version']);
  const userId = normalizeOptionalString(input.userId) ?? 'lan-default';

  return {
    id,
    userId,
    ...(resolvedDeviceId === undefined ? {} : { deviceId: resolvedDeviceId }),
    ...(deviceName === undefined ? {} : { deviceName }),
    ...(client === undefined ? {} : { client }),
    ...(applicationVersion === undefined ? {} : { applicationVersion }),
  };
}

function capabilityValue(
  capabilities: Record<string, unknown>,
  name: string,
): unknown {
  const matched = Object.entries(capabilities)
    .find(([key]) => key.toLowerCase() === name.toLowerCase());
  return matched?.[1];
}

function stringList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return values
    .map(entry => normalizedString(entry))
    .filter((entry): entry is string => entry !== undefined);
}

function booleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return typeof value === 'string' && ['true', '1', 'yes'].includes(value.trim().toLowerCase());
}

/** Maps transient internal state to Jellyfin's public SessionInfo DTO shape. */
export function jellyfinSessionToDto(
  session: JellyfinSession,
  options: JellyfinSessionDtoOptions,
): Record<string, unknown> {
  const rawCapabilities = session.capabilities ?? {};
  const playableMediaTypes = stringList(
    capabilityValue(rawCapabilities, 'PlayableMediaTypes'),
  );
  const supportedCommands = stringList(
    capabilityValue(rawCapabilities, 'SupportedCommands'),
  );
  const supportsMediaControl = booleanValue(
    capabilityValue(rawCapabilities, 'SupportsMediaControl'),
  );
  const capabilities = {
    PlayableMediaTypes: playableMediaTypes,
    SupportedCommands: supportedCommands,
    SupportsMediaControl: supportsMediaControl,
    SupportsContentUploading: booleanValue(
      capabilityValue(rawCapabilities, 'SupportsContentUploading'),
    ),
    SupportsPersistentIdentifier: booleanValue(
      capabilityValue(rawCapabilities, 'SupportsPersistentIdentifier'),
    ),
  };

  return {
    PlayState: {
      PositionTicks: session.positionTicks ?? 0,
      CanSeek: true,
      IsPaused: !session.isPlaying,
      IsMuted: false,
      RepeatMode: 'RepeatNone',
      ...(session.playSessionId === undefined ? {} : { MediaSourceId: session.playSessionId }),
    },
    AdditionalUsers: [],
    Capabilities: capabilities,
    PlayableMediaTypes: playableMediaTypes,
    Id: session.id,
    UserId: options.userId,
    UserName: options.userName,
    Client: session.client ?? 'Mediarr',
    LastActivityDate: session.lastActivityAt.toISOString(),
    DeviceName: session.deviceName ?? session.deviceId ?? session.id,
    DeviceId: session.deviceId ?? session.id,
    ApplicationVersion: session.applicationVersion ?? '',
    IsActive: true,
    SupportsMediaControl: supportsMediaControl,
  };
}

/**
 * In-memory record of playback sessions, fed by the TV client's explicit signals.
 *
 * The engine used to *infer* playback from progress beacons (PlaybackActivityGate): that
 * works, but with a 10-second lag, only within a 5-minute window, and the client beacons
 * while paused too. The owner asked (2026-11-21) for the client to tell the server instead
 * — "so that the server can throttle downloads and transcoding" — which is what this is:
 * the client posts start / pause / resume / stop, the server knows exactly when a stream is
 * being watched and can stand its heavy jobs down for that window.
 *
 * Deliberately in memory: a restart loses the set, and the client's next heartbeat (every
 * 20 s) repopulates it. Nothing about playback state is persisted here; PlaybackProgress
 * remains the durable record of positions.
 */

export type PlaybackSessionState = 'playing' | 'paused';

export interface PlaybackSessionSignal {
  mediaType: string;
  mediaId: number;
  state: PlaybackSessionState;
  /** Client-generated session id so one TV cannot clear another's entry. */
  sessionId?: string | null;
}

export interface PlaybackSessionInfo extends PlaybackSessionSignal {
  updatedAt: number;
}

/** A session silent for longer than this no longer holds the engine back. */
export const PLAYBACK_SESSION_TTL_MS = 45_000;

export class PlaybackSessionRegistry {
  private readonly sessions = new Map<string, PlaybackSessionInfo>();

  constructor(
    private readonly ttlMs: number = PLAYBACK_SESSION_TTL_MS,
    private readonly clock: () => number = Date.now,
  ) {}

  private key(signal: Pick<PlaybackSessionSignal, 'mediaType' | 'mediaId' | 'sessionId'>): string {
    return `${signal.mediaType}:${signal.mediaId}:${signal.sessionId ?? 'default'}`;
  }

  /** Records a heartbeat (start, resume, pause or stop). Stop removes the entry. */
  update(signal: PlaybackSessionSignal, action: 'update' | 'stop' = 'update'): void {
    const key = this.key(signal);
    if (action === 'stop') {
      this.sessions.delete(key);
      return;
    }
    this.sessions.set(key, { ...signal, updatedAt: this.clock() });
  }

  /** Drops entries that stopped sending heartbeats. */
  private prune(now: number): void {
    for (const [key, info] of this.sessions) {
      if (now - info.updatedAt > this.ttlMs) this.sessions.delete(key);
    }
  }

  /** True while at least one client is actually playing (paused sessions do not count). */
  isPlaying(): boolean {
    const now = this.clock();
    this.prune(now);
    for (const info of this.sessions.values()) {
      if (info.state === 'playing') return true;
    }
    return false;
  }

  /** Snapshot for diagnostics and tests. */
  active(): PlaybackSessionInfo[] {
    this.prune(this.clock());
    return [...this.sessions.values()];
  }
}

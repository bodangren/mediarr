/**
 * Decides whether a client is actually *playing* rather than merely beaconing.
 *
 * Why this exists (measured 2026-11-19): the TV client ships a playback-progress
 * beacon every 10 s unconditionally, including while paused. The post-import
 * library scan used a bare "was there a progress row in the last 5 minutes?"
 * test, so a client left paused on the couch — and the owner did leave it paused
 * for seven hours — kept the scan deferred on every single 30-minute import pass
 * (`Post-import scan deferred` at 13:01, 13:31, 14:01, 14:31, 15:01, 15:30).
 * Newly filed media then waited for the nightly 02:00 scan to become playable,
 * which is exactly the friction the frictionless-media goal exists to remove.
 *
 * Activity therefore means *the position moved since the previous check*. A
 * paused client reports the same position forever; a playing one does not. The
 * gate is deliberately conservative when it has no history: a session it has
 * never seen counts as active, so a genuinely fresh playback still defers the
 * scan once.
 *
 * Call it once per scheduler pass (it stores one snapshot) so the comparison
 * window matches the pass cadence.
 */
export class PlaybackActivityGate {
  private last: { key: string; position: number } | null = null;

  constructor(
    private readonly prisma: any,
    private readonly windowMs: number = 5 * 60 * 1000,
  ) {}

  /** True when someone is actively watching right now. */
  async isActive(now: number = Date.now()): Promise<boolean> {
    const client = this.prisma?.playbackProgress;
    if (!client?.findFirst) return false;

    const row = await client.findFirst({
      where: { updatedAt: { gte: new Date(now - this.windowMs) } },
      orderBy: { updatedAt: 'desc' },
      select: { mediaType: true, mediaId: true, userId: true, position: true },
    });

    if (!row) {
      this.last = null;
      return false;
    }

    const key = `${row.mediaType}:${row.mediaId}:${row.userId ?? 'default'}`;
    const position = Number(row.position ?? 0);
    const previous = this.last;
    this.last = { key, position };

    // A session the gate has not seen before is treated as live: the first pass
    // after a restart must not scan under someone who just pressed play.
    if (!previous || previous.key !== key) return true;

    return position !== previous.position;
  }
}

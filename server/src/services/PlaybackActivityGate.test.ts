import { describe, expect, it } from 'vitest';
import { PlaybackActivityGate } from './PlaybackActivityGate';

/**
 * Regression cover for 2026-11-19: a paused TV client beacons progress every
 * 10 s, so "a progress row exists in the last 5 minutes" was always true and
 * every post-import scan was deferred (six consecutive passes logged
 * "Post-import scan deferred" while the owner had the player paused).
 *
 * The gate must distinguish *playing* (position advanced) from *paused*
 * (position frozen while beacons keep arriving).
 */

type Row = {
  mediaType?: string;
  mediaId?: number;
  userId?: string;
  position?: number;
};

function fakePrisma(rows: Row[]) {
  const queries: Array<{ where: any; orderBy?: any }> = [];
  return {
    queries,
    playbackProgress: {
      findFirst: async (args: any) => {
        queries.push(args);
        if (rows.length === 0) return null;
        return { userId: 'owner', mediaType: 'EPISODE', mediaId: 781, position: 0, ...rows[0] };
      },
    },
  };
}

describe('PlaybackActivityGate', () => {
  it('is idle when nothing has reported progress at all', async () => {
    const gate = new PlaybackActivityGate(fakePrisma([]));
    expect(await gate.isActive()).toBe(false);
  });

  it('treats an unseen session as active so a fresh playback still defers a scan', async () => {
    const gate = new PlaybackActivityGate(fakePrisma([{ position: 657 }]));
    expect(await gate.isActive()).toBe(true);
  });

  it('is idle when a paused client keeps beaconing the same position', async () => {
    // The measured defect: same episode, same 10:57, beacons every 10 s.
    const gate = new PlaybackActivityGate(fakePrisma([{ mediaId: 781, position: 657 }]));
    expect(await gate.isActive()).toBe(true); // first sighting (conservative)
    expect(await gate.isActive()).toBe(false); // paused: position did not move
    expect(await gate.isActive()).toBe(false); // still paused a pass later
  });

  it('is active while the position keeps advancing', async () => {
    const rows: Row[] = [{ mediaId: 781, position: 657 }];
    const prisma = fakePrisma(rows);
    const gate = new PlaybackActivityGate(prisma);
    expect(await gate.isActive()).toBe(true);
    rows[0] = { mediaId: 781, position: 700 };
    expect(await gate.isActive()).toBe(true);
    rows[0] = { mediaId: 781, position: 760 };
    expect(await gate.isActive()).toBe(true);
  });

  it('is active again when the owner switches to something else even without a beacon', async () => {
    const rows: Row[] = [{ mediaId: 781, position: 657 }];
    const gate = new PlaybackActivityGate(fakePrisma(rows));
    await gate.isActive();
    await gate.isActive();
    rows[0] = { mediaId: 900, position: 0 };
    expect(await gate.isActive()).toBe(true);
  });

  it('forgets the snapshot when the beacon window lapses', async () => {
    const rows: Row[] = [{ mediaId: 781, position: 657 }];
    const prisma = fakePrisma(rows);
    const gate = new PlaybackActivityGate(prisma, 5 * 60 * 1000);
    await gate.isActive();
    rows.length = 0; // nobody has beaconed in the window
    expect(await gate.isActive()).toBe(false);
    // A brand-new beacon after the gap is a new session: defer once more.
    rows[0] = { mediaId: 781, position: 657 };
    expect(await gate.isActive()).toBe(true);
  });

  it('scopes the query to the five-minute beacon window, newest first', async () => {
    const prisma = fakePrisma([{ position: 1 }]);
    const gate = new PlaybackActivityGate(prisma);
    const now = 1_700_000_000_000;
    await gate.isActive(now);
    const first = prisma.queries[0]!;
    const where = first.where.updatedAt.gte as Date;
    expect(where.getTime()).toBe(now - 5 * 60 * 1000);
    expect(first.orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('is idle (rather than throwing) when the client has no progress table', async () => {
    const gate = new PlaybackActivityGate({});
    expect(await gate.isActive()).toBe(false);
  });
});

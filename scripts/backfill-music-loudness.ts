// One-off / repeatable: measure LUFS for every music track that lacks it.
//
// The 05:00 music scan measures 40 tracks per run; this script drains the backlog in one pass
// when the owner wants the level fix immediately. Engine code only — it never calls the REST API.
//
// Usage: npx tsx scripts/backfill-music-loudness.ts
const { DatabaseClient } = await import('../server/src/db/drizzleClient.js');
const { backfillTrackLoudness } = await import('../server/src/services/MusicLibraryScan.js');

const databaseUrl = process.env.DATABASE_URL ?? 'file:/config/mediarr.db';
const prisma: any = new (DatabaseClient as any)({ datasources: { db: { url: databaseUrl } } });
await prisma.$connect();
const started = Date.now();
let total = 0;
for (;;) {
  const measured: number = await (backfillTrackLoudness as any)(prisma.drizzle, { limit: 20 });
  total += measured;
  console.log(`measured ${measured} (total ${total}) in ${Math.round((Date.now() - started) / 1000)}s`);
  if (measured === 0) break;
}
console.log('done', total);
await prisma.$disconnect?.();
process.exit(0);

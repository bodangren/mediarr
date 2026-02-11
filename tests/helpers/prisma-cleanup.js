/**
 * Deterministic cleanup order for variant backfill tests to avoid FK violations.
 */
export async function cleanupVariantBackfillFixtures(prisma) {
  await prisma.subtitleHistory.deleteMany();
  await prisma.wantedSubtitle.deleteMany();
  await prisma.variantMissingSubtitle.deleteMany();
  await prisma.variantSubtitleTrack.deleteMany();
  await prisma.variantAudioTrack.deleteMany();
  await prisma.mediaFileVariant.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.series.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.media.deleteMany();
  await prisma.qualityProfile.deleteMany();
}

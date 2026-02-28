import { PrismaClient } from '@prisma/client';

/**
 * Quality source types matching Sonarr/Radarr conventions
 */
export type QualitySource =
  | 'unknown'
  | 'television'
  | 'web'
  | 'bluray'
  | 'dvd'
  | 'cam'
  | 'ts'
  | 'tc'
  | 'screener'
  | 'workprint';

export interface QualityDefinitionData {
  id: number;
  name: string;
  source: QualitySource;
  resolution: number;
  title?: string;
  weight: number;
}

/**
 * Standard quality definitions matching Sonarr/Radarr.
 * Weight determines the quality ranking order (higher = better quality).
 */
export const QUALITY_DEFINITIONS: QualityDefinitionData[] = [
  { id: 0, name: 'Unknown', source: 'unknown', resolution: 0, weight: 0 },
  { id: 1, name: 'SDTV', source: 'television', resolution: 480, weight: 1 },
  { id: 2, name: 'WEBRip-480p', source: 'web', resolution: 480, weight: 2 },
  { id: 3, name: 'WEBDL-480p', source: 'web', resolution: 480, weight: 3 },
  { id: 4, name: 'DVD', source: 'dvd', resolution: 480, weight: 4 },
  { id: 5, name: 'HDTV-720p', source: 'television', resolution: 720, weight: 5 },
  { id: 6, name: 'WEBRip-720p', source: 'web', resolution: 720, weight: 6 },
  { id: 7, name: 'WEBDL-720p', source: 'web', resolution: 720, weight: 7 },
  { id: 8, name: 'Bluray-720p', source: 'bluray', resolution: 720, weight: 8 },
  { id: 9, name: 'HDTV-1080p', source: 'television', resolution: 1080, weight: 9 },
  { id: 10, name: 'WEBRip-1080p', source: 'web', resolution: 1080, weight: 10 },
  { id: 11, name: 'WEBDL-1080p', source: 'web', resolution: 1080, weight: 11 },
  { id: 12, name: 'Bluray-1080p', source: 'bluray', resolution: 1080, weight: 12 },
  { id: 13, name: 'Bluray-1080p Remux', source: 'bluray', resolution: 1080, title: 'Remux', weight: 13 },
  { id: 14, name: 'HDTV-2160p', source: 'television', resolution: 2160, weight: 14 },
  { id: 15, name: 'WEBRip-2160p', source: 'web', resolution: 2160, weight: 15 },
  { id: 16, name: 'WEBDL-2160p', source: 'web', resolution: 2160, weight: 16 },
  { id: 17, name: 'Bluray-2160p', source: 'bluray', resolution: 2160, weight: 17 },
  { id: 18, name: 'Bluray-2160p Remux', source: 'bluray', resolution: 2160, title: 'Remux', weight: 18 },
];

/**
 * Seeds quality definitions into the database.
 * Uses upsert for idempotency — safe to call multiple times.
 */
export async function seedQualityDefinitions(prisma: PrismaClient): Promise<number> {
  for (const quality of QUALITY_DEFINITIONS) {
    await prisma.qualityDefinition.upsert({
      where: { id: quality.id },
      update: {
        name: quality.name,
        source: quality.source,
        resolution: quality.resolution,
        title: quality.title ?? null,
        weight: quality.weight,
      },
      create: quality,
    });
  }
  return QUALITY_DEFINITIONS.length;
}

interface QualityProfilePreset {
  name: string;
  cutoff: number;
  allowedIds: number[];
}

function buildItems(allowedIds: number[]): Array<{ quality: { id: number; name: string; source: string; resolution: number }; allowed: boolean }> {
  return QUALITY_DEFINITIONS.map(q => ({
    quality: { id: q.id, name: q.name, source: q.source, resolution: q.resolution },
    allowed: allowedIds.includes(q.id),
  }));
}

const QUALITY_PROFILE_PRESETS: QualityProfilePreset[] = [
  {
    name: 'Any',
    cutoff: 1, // SDTV
    allowedIds: QUALITY_DEFINITIONS.map(q => q.id),
  },
  {
    name: 'SD',
    cutoff: 1, // SDTV
    allowedIds: [1, 2, 3, 4],
  },
  {
    name: 'HD-720p',
    cutoff: 5, // HDTV-720p
    allowedIds: [5, 6, 7, 8],
  },
  {
    name: 'HD-1080p',
    cutoff: 9, // HDTV-1080p
    allowedIds: [9, 10, 11, 12],
  },
  {
    name: 'Ultra-HD',
    cutoff: 14, // HDTV-2160p
    allowedIds: [14, 15, 16, 17],
  },
  {
    name: 'HD - 720p/1080p',
    cutoff: 5, // HDTV-720p
    allowedIds: [5, 6, 7, 8, 9, 10, 11, 12],
  },
];

/**
 * Seeds standard quality profiles into the database.
 * Uses upsert for idempotency — safe to call multiple times.
 * Existing profiles with matching names are updated in place, not duplicated.
 */
export async function seedQualityProfiles(prisma: PrismaClient): Promise<number> {
  for (const preset of QUALITY_PROFILE_PRESETS) {
    const items = buildItems(preset.allowedIds);
    await prisma.qualityProfile.upsert({
      where: { name: preset.name },
      update: { cutoff: preset.cutoff, items: items as never },
      create: { name: preset.name, cutoff: preset.cutoff, items: items as never },
    });
  }
  return QUALITY_PROFILE_PRESETS.length;
}

/**
 * Get all quality definitions for API responses
 */
export function getQualityDefinitions(): QualityDefinitionData[] {
  return [...QUALITY_DEFINITIONS];
}

/**
 * Get a single quality definition by ID
 */
export function getQualityById(id: number): QualityDefinitionData | undefined {
  return QUALITY_DEFINITIONS.find(q => q.id === id);
}

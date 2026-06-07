import { DatabaseClient } from '../db/drizzleClient';
import { DEFAULT_APP_SETTINGS } from '../repositories/AppSettingsRepository';

function executeRaw(sqlite: any, query: string, ...params: unknown[]): number {
  const stmt = sqlite.prepare(query);
  const result = stmt.run(...params);
  return Number(result.changes ?? 0);
}

export async function repairMalformedJsonColumns(prisma: DatabaseClient): Promise<void> {
  const requiredAppSettingsDefaults: Record<string, string> = {
    torrentLimits: JSON.stringify(DEFAULT_APP_SETTINGS.torrentLimits),
    schedulerIntervals: JSON.stringify(DEFAULT_APP_SETTINGS.schedulerIntervals),
    pathVisibility: JSON.stringify(DEFAULT_APP_SETTINGS.pathVisibility),
  };

  const nullableAppSettingsColumns = ['apiKeys', 'host', 'security', 'logging', 'update'];

  try {
    const repairs: Array<{ label: string; changes: number }> = [];

    const qualityProfileRes = executeRaw(prisma.sqlite, `
      UPDATE "QualityProfile"
      SET "items" = '[]'
      WHERE "items" IS NULL OR json_valid("items") = 0
    `);
    repairs.push({ label: 'QualityProfile.items', changes: qualityProfileRes });

    const notificationRes = executeRaw(prisma.sqlite, `
      UPDATE "Notification"
      SET "config" = '{}'
      WHERE "config" IS NULL OR json_valid("config") = 0
    `);
    repairs.push({ label: 'Notification.config', changes: notificationRes });

    const activityEventRes = executeRaw(prisma.sqlite, `
      UPDATE "ActivityEvent"
      SET "details" = NULL
      WHERE "details" IS NOT NULL AND json_valid("details") = 0
    `);
    repairs.push({ label: 'ActivityEvent.details', changes: activityEventRes });

    const torrentEtaDownscaleRes = executeRaw(prisma.sqlite, `
      UPDATE "Torrent"
      SET "eta" = CAST("eta" / 1000 AS INTEGER)
      WHERE "eta" > 2147483647
    `);
    repairs.push({ label: 'Torrent.eta.downscaled', changes: torrentEtaDownscaleRes });

    const torrentEtaClampRes = executeRaw(prisma.sqlite, `
      UPDATE "Torrent"
      SET "eta" = 2147483647
      WHERE "eta" > 2147483647
    `);
    repairs.push({ label: 'Torrent.eta.clamped', changes: torrentEtaClampRes });

    const torrentEtaNegativeRes = executeRaw(prisma.sqlite, `
      UPDATE "Torrent"
      SET "eta" = NULL
      WHERE "eta" < 0
    `);
    repairs.push({ label: 'Torrent.eta.negative-null', changes: torrentEtaNegativeRes });

    for (const [column, defaultJson] of Object.entries(requiredAppSettingsDefaults)) {
      const res = executeRaw(prisma.sqlite, 
        `UPDATE "AppSettings" SET "${column}" = ? WHERE "${column}" IS NULL OR json_valid("${column}") = 0`,
        defaultJson,
      );
      repairs.push({ label: `AppSettings.${column}`, changes: res });
    }

    for (const column of nullableAppSettingsColumns) {
      const res = executeRaw(prisma.sqlite, `
        UPDATE "AppSettings"
        SET "${column}" = NULL
        WHERE "${column}" IS NOT NULL AND json_valid("${column}") = 0
      `);
      repairs.push({ label: `AppSettings.${column}`, changes: res });
    }

    const changed = repairs.filter((repair) => repair.changes > 0);
    if (changed.length > 0) {
      console.warn(
        'Repaired malformed JSON in SQLite:',
        changed.map((repair) => `${repair.label}=${repair.changes}`).join(', '),
      );
    }
  } catch (err) {
    console.error('Failed to run JSON repairs:', err);
  }
}

// CJS companion for createRequire compatibility.
// The canonical implementation lives in repairJsonColumns.ts.
// This file is a thin JS mirror for environments where createRequire cannot load .ts files.

function executeRaw(sqlite, query, ...params) {
  const stmt = sqlite.prepare(query);
  const result = stmt.run(...params);
  return Number(result.changes ?? 0);
}

async function repairMalformedJsonColumns(prisma) {
  const requiredAppSettingsDefaults = {
    torrentLimits: JSON.stringify({
      maxActiveDownloads: 3,
      maxActiveSeeds: 3,
      globalDownloadLimitKbps: null,
      globalUploadLimitKbps: null,
      incompleteDirectory: '',
      completeDirectory: '',
      seedRatioLimit: 0,
      seedTimeLimitMinutes: 0,
      seedLimitAction: 'pause',
    }),
    schedulerIntervals: JSON.stringify({
      rssSyncMinutes: 15,
      availabilityCheckMinutes: 30,
      torrentMonitoringSeconds: 5,
      wantedSearchMinutes: 60,
    }),
    pathVisibility: JSON.stringify({
      showDownloadPath: true,
      showMediaPath: true,
    }),
  };

  const nullableAppSettingsColumns = ['apiKeys', 'host', 'security', 'logging', 'update'];

  try {
    const repairs = [];

    const qualityProfileRes = executeRaw(prisma.sqlite,
      `UPDATE "QualityProfile"
       SET "items" = '[]'
       WHERE "items" IS NULL OR json_valid("items") = 0`
    );
    repairs.push({ label: 'QualityProfile.items', changes: qualityProfileRes });

    const notificationRes = executeRaw(prisma.sqlite,
      `UPDATE "Notification"
       SET "config" = '{}'
       WHERE "config" IS NULL OR json_valid("config") = 0`
    );
    repairs.push({ label: 'Notification.config', changes: notificationRes });

    const activityEventRes = executeRaw(prisma.sqlite,
      `UPDATE "ActivityEvent"
       SET "details" = NULL
       WHERE "details" IS NOT NULL AND json_valid("details") = 0`
    );
    repairs.push({ label: 'ActivityEvent.details', changes: activityEventRes });

    const torrentEtaDownscaleRes = executeRaw(prisma.sqlite,
      `UPDATE "Torrent"
       SET "eta" = CAST("eta" / 1000 AS INTEGER)
       WHERE "eta" > 2147483647`
    );
    repairs.push({ label: 'Torrent.eta.downscaled', changes: torrentEtaDownscaleRes });

    const torrentEtaClampRes = executeRaw(prisma.sqlite,
      `UPDATE "Torrent"
       SET "eta" = 2147483647
       WHERE "eta" > 2147483647`
    );
    repairs.push({ label: 'Torrent.eta.clamped', changes: torrentEtaClampRes });

    const torrentEtaNegativeRes = executeRaw(prisma.sqlite,
      `UPDATE "Torrent"
       SET "eta" = NULL
       WHERE "eta" < 0`
    );
    repairs.push({ label: 'Torrent.eta.negative-null', changes: torrentEtaNegativeRes });

    for (const [column, defaultJson] of Object.entries(requiredAppSettingsDefaults)) {
      const res = executeRaw(prisma.sqlite,
        `UPDATE "AppSettings" SET "${column}" = ? WHERE "${column}" IS NULL OR json_valid("${column}") = 0`,
        defaultJson,
      );
      repairs.push({ label: `AppSettings.${column}`, changes: res });
    }

    for (const column of nullableAppSettingsColumns) {
      const res = executeRaw(prisma.sqlite,
        `UPDATE "AppSettings"
         SET "${column}" = NULL
         WHERE "${column}" IS NOT NULL AND json_valid("${column}") = 0`
      );
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

module.exports = { repairMalformedJsonColumns };

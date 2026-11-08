/**
 * Alert delivery with retry (track chore_migrate_hermes_automation_20261107, B9).
 *
 * The ledger row is the source of truth and the JSONL line is the local-first fallback, so delivery is
 * best-effort by design: a missing or failing transport must never lose an alert, it only delays it.
 * Each attempt increments `attempts`; after `maxAttempts` the row becomes FAILED for the watchdog to
 * surface, while still PENDING rows are retried on the next pass.
 */

export async function deliverPendingAlerts(db, options = {}) {
  const {
    transport = null,
    maxAttempts = 3,
    now = new Date(),
    limit = 50,
  } = options;
  if (typeof transport !== 'function') {
    const pending = db.prepare("SELECT count(*) n FROM alerts WHERE status = 'PENDING'").get();
    return { attempted: 0, delivered: 0, failed: 0, remaining: Number(pending?.n ?? 0), reason: 'no transport configured' };
  }
  const rows = db.prepare(
    "SELECT * FROM alerts WHERE status = 'PENDING' AND attempts < ? ORDER BY id ASC LIMIT ?",
  ).all(maxAttempts, limit);

  let delivered = 0;
  let failed = 0;
  for (const row of rows) {
    const alert = {
      id: row.id,
      level: row.level,
      code: row.code,
      message: row.message,
      context: row.context_json ? JSON.parse(row.context_json) : null,
      createdAt: row.created_at,
    };
    try {
      await transport(alert);
      db.prepare("UPDATE alerts SET status = 'DELIVERED', delivered_at = ?, attempts = attempts + 1 WHERE id = ?")
        .run(new Date(now).toISOString(), row.id);
      delivered += 1;
    } catch {
      const attempts = row.attempts + 1;
      const status = attempts >= maxAttempts ? 'FAILED' : 'PENDING';
      db.prepare('UPDATE alerts SET attempts = ?, status = ? WHERE id = ?').run(attempts, status, row.id);
      failed += 1;
    }
  }
  const remaining = db.prepare("SELECT count(*) n FROM alerts WHERE status = 'PENDING'").get();
  return { attempted: rows.length, delivered, failed, remaining: Number(remaining?.n ?? 0) };
}

/** Webhook transport from the environment: POST the alert JSON; absent env means no transport. */
export function webhookTransport(env = process.env, fetchImpl = fetch) {
  const url = env.MEDIA_AUTOMATION_ALERT_WEBHOOK?.trim();
  if (!url) return null;
  return async (alert) => {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(alert),
    });
    if (!response.ok) throw new Error(`alert webhook returned ${response.status}`);
  };
}

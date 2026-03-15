import { useCallback, useEffect, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import type { Backup, BackupSchedule, UpdateBackupScheduleInput } from '@/lib/api/backupApi';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { Button } from '@/components/ui/button';
import { formatBytes, formatDateTime, formatRelativeDate } from '@/lib/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Backup['type'] }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${type === 'manual' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
      {type}
    </span>
  );
}

// ─── Backup List ──────────────────────────────────────────────────────────────

function BackupList({ onCreated }: { onCreated: () => void }) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionIds, setActionIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApiClients().backupApi.getBackups();
      setBackups(data);
      setError(null);
    } catch {
      setError('Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBackups();
  }, [fetchBackups]);

  async function handleCreateNow() {
    setCreating(true);
    try {
      await getApiClients().backupApi.createBackup();
      await fetchBackups();
      onCreated();
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(id: number, name: string) {
    if (!window.confirm(`Restore from backup "${name}"? The application will restart.`)) return;
    setActionIds(prev => new Set(prev).add(id));
    try {
      await getApiClients().backupApi.restoreBackup(id);
    } finally {
      setActionIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function handleDownload(id: number) {
    setActionIds(prev => new Set(prev).add(id));
    try {
      const result = await getApiClients().backupApi.downloadBackup(id);
      window.open(result.downloadUrl, '_blank');
    } finally {
      setActionIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete backup "${name}"? This cannot be undone.`)) return;
    setActionIds(prev => new Set(prev).add(id));
    try {
      await getApiClients().backupApi.deleteBackup(id);
      await fetchBackups();
    } finally {
      setActionIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Backups</h2>
        <Button variant="default" disabled={creating} onClick={() => { void handleCreateNow(); }}>
          {creating ? 'Creating…' : 'Back Up Now'}
        </Button>
      </div>

      {error && <p className="text-sm text-status-error">{error}</p>}

      {loading ? (
        <p className="text-sm text-text-secondary">Loading backups…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-text-secondary">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Size</th>
                <th className="pb-2 pr-4 font-medium">Created</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(backup => (
                <tr key={backup.id} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-4 font-medium max-w-xs truncate" title={backup.name}>
                    {backup.name}
                  </td>
                  <td className="py-2 pr-4"><TypeBadge type={backup.type} /></td>
                  <td className="py-2 pr-4 text-text-secondary tabular-nums">{formatBytes(backup.size)}</td>
                  <td className="py-2 pr-4 text-text-secondary">{formatRelativeDate(backup.created)}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        className="text-xs"
                        disabled={actionIds.has(backup.id)}
                        onClick={() => { void handleRestore(backup.id, backup.name); }}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs"
                        disabled={actionIds.has(backup.id)}
                        onClick={() => { void handleDownload(backup.id); }}
                      >
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        className="text-xs"
                        disabled={actionIds.has(backup.id)}
                        onClick={() => { void handleDelete(backup.id, backup.name); }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-text-secondary">No backups yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Schedule Panel ───────────────────────────────────────────────────────────

function BackupSchedulePanel() {
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [enabled, setEnabled] = useState(true);
  const [interval, setInterval] = useState<BackupSchedule['interval']>('daily');
  const [retentionDays, setRetentionDays] = useState(30);

  useEffect(() => {
    getApiClients().backupApi.getBackupSchedule().then(data => {
      setSchedule(data);
      setEnabled(data.enabled);
      setInterval(data.interval);
      setRetentionDays(data.retentionDays);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const input: UpdateBackupScheduleInput = { enabled, interval, retentionDays };
      const updated = await getApiClients().backupApi.updateBackupSchedule(input);
      setSchedule(updated);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-text-secondary">Loading schedule…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="rounded border border-border-subtle"
          />
          Enable automatic backups
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-text-secondary">Interval</span>
          <select
            value={interval}
            onChange={e => setInterval(e.target.value as BackupSchedule['interval'])}
            disabled={!enabled}
            className="block w-full rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-text-secondary">Retention (days)</span>
          <input
            type="number"
            min={1}
            value={retentionDays}
            onChange={e => setRetentionDays(Math.max(1, Number(e.target.value)))}
            disabled={!enabled}
            className="block w-full rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-sm disabled:opacity-50"
          />
        </label>
      </div>

      {schedule && (
        <div className="text-xs text-text-secondary space-y-0.5">
          {schedule.lastBackup && <p>Last backup: {formatDateTime(schedule.lastBackup)}</p>}
          {schedule.enabled && <p>Next backup: {formatDateTime(schedule.nextBackup)}</p>}
        </div>
      )}

      <Button variant="default" disabled={saving} onClick={() => { void handleSave(); }}>
        {saving ? 'Saving…' : 'Save Schedule'}
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SystemBackupPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <RouteScaffold title="Backup" description="Unified backup and restore workflow.">
      <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <BackupList key={refreshKey} onCreated={() => setRefreshKey(k => k + 1)} />
      </section>

      <section className="space-y-2 rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold">Automatic Backup Schedule</h2>
        <BackupSchedulePanel />
      </section>
    </RouteScaffold>
  );
}

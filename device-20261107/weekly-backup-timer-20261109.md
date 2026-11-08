# Weekly backup timer (B7, 2026-11-09)

`BackupService.getSchedule()` honestly reports `supported: false` until a scheduler is composed, so the
timer is implemented where the product's scheduler already lives — the **harness** — instead of
pretending inside the server.

## Manual proof that the action works
`POST /api/backups` → `ok: true`, created
`manual_backup_2026-11-08T21-35-37-467_68d7f055.db`, **87,465,984 bytes** (87 MB) in
`/config/backups/`; `GET /api/backups` lists it. No retention/prune was performed (owner decision).

## Scheduled run
- Task id: `schedule-582bb043-2214-4b44-8edb-dbe41e0d2c69`
- Title: "Mediarr weekly database backup"
- `DTSTART;TZID=Asia/Shanghai:20261115T043000` + `RRULE:FREQ=WEEKLY;BYDAY=SU;BYHOUR=4;BYMINUTE=30`
  → next delivery **2026-11-15 04:30 +08:00**, one fresh session per delivery.
- The prompt is deterministic: POST `/api/backups`, verify ok + size ≥50 MB + file exists, count
  backups, append one JSON line to `/config/backup-receipts.jsonl`, and **never delete/restore/prune**.

## Why not a server cron
`BackupService.updateSchedule` deliberately throws `supported:false`; wiring a timer that writes
scheduled entries without a persisted schedule would make the settings UI lie. Harness scheduling is
the product's brain (rule: harness is part of the product), and the run performs only bookkeeping.

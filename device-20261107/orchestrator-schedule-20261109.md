# Daily media-orchestrator schedule is live (B6, 2026-11-09)

The orchestrator prompt from `automation/prompts/media-orchestrator-daily.md` is now a **harness
scheduled run** instead of a manual ritual:

- Task id: `schedule-81975ac5-340e-478f-8ef6-f8ad7e0ab335`
- Title: "Mediarr daily media orchestrator"
- Rule: `DTSTART;TZID=Asia/Shanghai:20261109T030000` + `FREQ=DAILY` → next delivery
  **2026-11-10 03:00 Asia/Shanghai** (today's 03:00 had already passed at creation time).
- Target: a **new session per delivery** (fresh context, this repo as cwd, standard preset).
- The prompt instructs the run to: follow the orchestrator file with its hard bridge-tool
  precondition, reconcile against the live HTTP API, **avoid destructive actions without owner
  approval**, append one JSON receipt to `/config/orchestrator-receipts.jsonl`, and report a summary;
  a run that cannot check a domain must mark itself not-ok.

## Why this is the right place for the timer
The harness already owns scheduling (`@deepseek-ai/dsh-schedule`); re-implementing cron inside the
plugin would be a second scheduler and one more thing to drift. B7's finer timers (tidy 04:30,
retention 04:45, nightly 05:00, weekly backup) stay open: several overlap native Mediarr tasks and
some are destructive, so they should be wired with the owner at the cutover, not silently created.

## Verified
`schedule_list` shows the task active with `scheduledAtLocal 2026-11-10T03:00:00+08:00`; the manual
first run is recorded in `device-20261107/orchestrator-manual-run-20261109.md`.

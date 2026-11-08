# Manual orchestrator run — first pass (2026-11-09, pre-scheduled)

This is the manual run B6 requires before the 03:00 schedule: the orchestrator prompt
(`automation/prompts/media-orchestrator-daily.md`) was executed against live Mediarr truth using the
same tools the daily run will use.

## Preconditions
- `mcp__webbridge__navigate` / `mcp__webbridge__evaluate` are registered in this session (verified by
  earlier browser work this session) — no BRIDGE_TOOLS_ABSENT abort needed.
- Ledger plugin packaged (`automation/dsh-media-automation`, 7 tests) but not yet linked into the
  profile (owner-gated cutover), so this run recorded its findings here instead of `runs` rows.

## Reconciled truth
| Domain | Measurement | Verdict |
|---|---|---|
| Server | `/api/health` 200; systemd enabled + linger; shutdown bounded (10–25 s restart) | healthy |
| Scheduler | subtitle-sync, youtube-download, bilingual-subs, music-nightly-receipt registered; interval persistence proven across restart | active |
| Subtitle timing | 80/82 aligned (97.6%), 2 gave_up; 1,430 of 1,512 Chinese sidecars still queued (background, ~5/30 min) | in progress |
| Subtitle coverage | 50 priority items: dual 9 / zho-only 10 / en-only 18 / none 13; 58 EN + 29 ZH wanted rows queued | blocked on provider API keys |
| Music | 217 tracks = 217 source files; nightly receipt writes 05:10 | complete |
| YouTube | 285 available / 42 failed / 260 pending; batch 4 per 20 min; remux fast path live | in progress |
| Adult | 197 items, 8 needsReview | tracked |

## Actions taken
- None destructive. The run only measured and recorded; no domain needed a grab/delete this pass.

## Blocked (owner-gated)
1. Subtitle provider API key (acquisition half of coverage).
2. Reboot window (B1) and harness-host/plugin cutover (B3/B4-link) — both restart this session.
3. 169 traditional-Chinese subtitles: convert-with-backup vs re-download policy.

# Subtitle sync background pass — measured progress (2026-11-09 13:50 local)

`GET /api/subtitles/sync/status`:
```
attempted 139 · ok 136 · gaveUp 3 · failed 0 · candidates 1512 · remaining 1373
```
State file breakdown by day (`syncedAt`): 2026-11-07 **44**, 2026-11-08 **63**, 2026-11-09 **29** (day so far).
Measured recent rate ≈ **5.3/hour** (not the theoretical 5 per 30 min — some candidates need multiple
audio passes and three gave up). At that rate the remaining 1,373 candidates need ≈ **260 hours ≈ 11 days**
of background work; it does not block playback and every attempt is idempotent by sidecar hash + video size.

Acquisition for items without Chinese subtitles remains **owner-gated** (all providers disabled), so the
pass can only realign what already exists.

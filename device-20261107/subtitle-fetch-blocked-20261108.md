# Subtitle fetch failures — honest status (2026-11-08)

`GET /api/subtitles/wanted/status` now reports the queue truthfully:

```json
{
  "counts": { "FAILED": 1740, "PENDING": 79 },
  "staleFailures": 1740,
  "errors": {},
  "latestCoverage": { "dual": 9, "zho-only": 10, "en-only": 18, "none": 13 },
  "retryBlockedReason": "1740 FAILED wanted rows predate error capture; retrying them requires an enabled subtitle provider"
}
```

## Findings
1. **All subtitle providers are disabled.** OpenSubtitles and ASSRT are both `enabled: false` with
   `apiKey: null`; the automation service deliberately idles the whole cycle when no provider is
   usable (`runAutomationCycle` returns `skippedNoProvider: 1` immediately) rather than spending ~10 s
   scanning 100 variants to download nothing.
2. **The 1740 FAILED rows are history, not current attempts.** `WantedSubtitle` had no error columns
   before this round, so those rows carry no reason and `attempts = 0`. They cannot be diagnosed
   retrospectively and will not be retried until a provider exists.
3. **New failures are now diagnosable.** Migration 0016 adds `lastError`, `attempts`, `lastAttemptAt`;
   the repository increments attempts and stores the provider's exact message on every attempt, and
   clears the error on success. `provider returned no matching subtitle` is recorded when a provider
   answers but nothing matches.

## What is owner-gated
Subtitle fetching cannot progress without **at least one provider API key** (OpenSubtitles or ASSRT)
in Settings → Subtitle Providers. That is not a code defect; it is the one input the agent cannot
supply. Once a key is present, the next automation cycle will retry the 79 PENDING priority rows and
record real per-row reasons.

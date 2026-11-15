# Subagent: error-triage

**Goal:** triage new errors the TV client posted, and fix P0/P1 properly in the repo.

**Steps**

1. Read `/config/client-errors.jsonl` directly (no API) and the high-water mark in
   `device-20261107/client-errors-seen.txt`; consider only records newer than the mark. Ignore
   severity `smoke`.
2. Group by fingerprint (message with ids/timestamps stripped). For each **new** distinct failure:
   - identify the code path from the stack (`server/src/...` / `clients/mediarr-client/lib/...`);
   - decide P0/P1/P2 with a one-line reason;
   - P0/P1: fix in the repo following Measure (track task, failing test where practical), run
     `npx tsc -p server/tsconfig.json --noEmit` and/or `npx vitest run <file>` (or `flutter test
     --no-pub` / `flutter analyze --no-pub`), commit with a note;
   - P2: report only.
3. If a client fix needs an APK: build with the command in the scheduled triage prompt, publish,
   install with adb, then re-assert the TV HOME (`tv-launcher-recover.sh`).
4. Advance the high-water mark to the newest triaged record and commit it.
5. Report a short table: fingerprint / count / likely cause / action / open. If nothing is new,
   say exactly `no new client errors` and stop.

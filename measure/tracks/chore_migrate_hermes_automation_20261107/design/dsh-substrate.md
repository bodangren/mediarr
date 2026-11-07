# DSH substrate — how recurring media work actually runs

> Brief B, 2026-11-07. Citations are `path:line` under
> `ROOT = /home/daniel-bo/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/`
> (`dsh-schedule/lib/index.js:1100` = `$ROOT/dsh-schedule/lib/index.js:1100`), version
> `dsh-schedule` 0.2.2-rc.1. All DSH claims were read in that tree this session. The live profile
> was not modified; no service was started or stopped.

## 0. Answer

**DSH schedules deliver reliably and execute unreliably.** Delivery is durable (inbox append +
`session/flush` + receipt). Execution is an ordinary agent turn: if the provider is unreachable
the turn fails, the failure lands *only in that Session's log*, and the task silently advances —
Hermes' failure mode one layer lower. A plugin watching `session/event` → `turn/end` can close the
gap with no LLM involved, but it does not exist today and must be built.

## 1. `schedule_create` semantics

### 1.1 Timing and RRULE bounds

Seven kinds: `after`, `at`, `every`, `daily`, `weekly`, `cron`, `rrule`
(`dsh-schedule/README.md:139-145`). The model tool exposes **RRULE only**; Cron is a UI dialect
(`dsh-schedule/README.md:119`). RRULE input is one `DTSTART` line plus one `RRULE` line
(`dsh-schedule/README.md:144`).

Bounds read from source: `COUNT` ≤ 1000, use `UNTIL` beyond (`dsh-util-time/lib/index.js:780,991`);
10 080 candidates per FREQ period (`:782,1058`); 31 `BYSETPOS` values (`:784,1061`); one-minute
recurrence floor (`dsh-util-time/README.md:79`); 400-year Cron search horizon
(`dsh-util-time/README.md:78`); explicit IANA zone only, no fixed offsets
(`dsh-util-time/README.md:69-71`). Hourly and daily cadences are therefore trivial; the real cost
is that every occurrence is a whole agent turn.

### 1.2 The three targets

| Target | Session identity | State continuity | Captured at create |
|---|---|---|---|
| `this_session` | the calling Session, forever | full history; each run reads the previous transcript | n/a |
| `new_once` | one reserved id, created on first delivery, then reused | full history, created lazily | caller's `cwd` + composed preset |
| `new` | fresh Session per delivery | **none** — cold start | caller's `cwd` + composed preset |

Capture is `agent.session.header.cwd` plus `agentPresets.composedPreset(agent.ctx)`
(`dsh-tool-schedule/lib/index.js:481-494`), applied through
`sessionController.create({sessionId, cwd, agentPreset})` (`dsh-schedule/lib/index.js:1498-1507`).
`new_once` is rewritten to a plain `session` target on first delivery
(`dsh-schedule/lib/index.js:1421-1427`), so re-pointing it needs an explicit `edit`. Reused targets
accumulate context (good for "what did I queue yesterday", bad because a bad turn stays in context
forever); `new` is stateless and is the only target allowed to overlap.

### 1.3 Downtime, crash, repetition

- **Host must be running**: "Tasks survive restarts, but the Host must be running to deliver them.
  After a restart, a recurring task sends only its latest missed occurrence"
  (`dsh-schedule/README.md:12`). Missed occurrences collapse rather than queue
  (`:285`) — a three-day outage costs one run and says nothing.
- **At-least-once, not exactly-once**: session flush and task acknowledgment are separate commits,
  so delivery can duplicate after a crash (`dsh-schedule/README.md:177,280`). Every scheduled
  prompt must be idempotent; the substrate will not do it for you.
- **Receipt ≠ execution**, stated twice: "receipts establish inbox persistence, not execution"
  (`:280`); "Records confirm that an instruction reached a conversation inbox; check the receiving
  conversation for the execution result" (`:39`). This is the load-bearing sentence.
- **A failed enqueue does not retry**: "there is no retry loop. A later management change, wake, or
  restart can retry it" (`:279`); in code it is one `logger.warn` with no state change
  (`dsh-schedule/lib/index.js:1323-1329`). The task keeps its due `scheduledAt`, so the next drive
  tick retries — but only while the Host lives.

### 1.4 Overlap: what is and is not prevented

`drive()` skips any task id in the in-memory `executing` set (`dsh-schedule/lib/index.js:1249`);
ids enter when the reminder is enqueued (`:1381-1399`) and leave at the target Agent's
whole-agent idle boundary (`:1405-1419`). A hard floor of `MIN_DELIVERY_INTERVAL_MS = 60 * 1000`
(`:1100`) plus the configurable new-session interval (`:1331-1338`; default 60 s,
`dsh-schedule/README.md:59`) applies on top.

Same task into a **reused** Session is serialized. A **`new`** target is concurrent by design with
no cap ("per-delivery Sessions can overlap without a concurrency cap", `:285`). **Two different
tasks can always overlap** — there is no cross-task lock; if `downloads-tidy` and
`media-orchestrator` must not both prune, that lock is yours. After restart the set is rebuilt by
re-reading the last receipt's Session and re-enqueueing a still-queued message
(`:1348-1375`): crash recovery for the *delivery*, never for the *work*. A scheduled task therefore
cannot guarantee its work ran, retry a failed attempt, notice its own non-delivery during downtime,
serialize across tasks, alert outside its own transcript, or run at all without a live Host.

## 2. Scheduled prompt → work, and the provider-outage trace

**What runs it.** The target Session with the preset captured at creation (§1.2). For
`new`/`new_once` that is the composer's preset — bash, filesystem, MCP, every tool — so a scheduled
prompt is *not* sandboxed relative to an interactive turn.

**What arrives.** A user-role message with `source: { kind: "schedule" }`
(`dsh-schedule/lib/index.js:1381-1390`) whose text is fixed framing followed by machine-readable
`schedule_id_json`, `occurrence_at`, `reminder_prompt_json` (`:892-900`; format at
`dsh-schedule/README.md:229`). That `(task id, occurrence_at)` pair is a ready-made idempotency key.

**Trace of a provider outage:**

1. Timer fires. Delivery is local — inbox append → `session/flush` → receipt saved → occurrence
   advanced (`:1381-1399`, `:1421-1441`). **The provider is not involved**; delivery succeeds with
   the network down.
2. The turn opens and calls the model.
3. `dsh-llm-retry` may retry at the `agent/request-error` waterfall. Default normal mode: five
   retries for `EMPTY_RESPONSE|RATE_LIMIT|SERVER|TIMEOUT|TRANSPORT`, backoff 500 ms→10 s, 10 %
   jitter; `always` mode retries without limit until success, cancellation or disposal
   (`dsh-llm-retry/README.md:50`). Retries are never model-visible (`:58`).
4. On exhaustion — or an ineligible code such as auth/404/config — the turn closes with a typed
   failure: `turn/end { turn, reason: { kind: 'error', error: { code, message } } }`
   (`dsh-agent-loop/lib/index.js:809-824`; type at `dsh-session/lib/types/types.d.ts:279-282`).
5. Nothing else happens. The task holds a receipt and an advanced `scheduledAt`, and the task
   record has **no error field at all** (`dsh-schedule/README.md:124-145`). The agent goes idle,
   the slot is released (`:1411-1419`), the next occurrence arms normally.

**Verdict: DSH does not fix the Hermes failure mode by itself.** The failure is now a durable,
typed event with a provider code rather than a Python exception in an unread log — but nothing
consumes it: no failure counter, no dead-man switch, no notification. An hourly task during a
six-hour outage yields six silent misses. The material for the fix exists (§3.5); the consumer
does not.

## 3. Plugin mechanics

### 3.1 Package shape

A bundle is a normal npm package with a patch declared in `package.json`
(`dsh-package-manifest/README.md:40,46`): `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`
alongside `"type":"module"` and `"main":"lib/index.js"`. The patch is a top-level YAML array in the
profile patch's dialect: `- insert: [ {id, name} … ]` for new rows, `id:`-targeted entries to
override or disable existing ones (`dsh-personalized-recommendations/cordis.patch.yml:1-3`;
`dsh-base/cordis.patch.yml:28-29`). Composition order: `dsh.profile.bundles` in order → profile
patch → home patch → `--patch` overlays (`~/.dsh/profiles/web/cordis.patch.yml:1-3`).

### 3.2 Install paths

`dsh plugin --profile web add <spec>` (the CLI's own usage line) or
`plugin_manager({action:'install_bundle', target})`, which needs `danger-full-access`. Both run
pnpm in the profile, restore `package.json`/`pnpm-lock.yaml` on failure, and check `engines.dsh`
and DSH peer ranges first (`dsh-plugin-manager/README.md:77`). A local directory should be
installed as `link:<abs path>` — the development-target form (`:52`) — so edits need no
reinstall. Hand-editing the profile works but skips those checks.

### 3.3 Hot reload vs restart

Base enables HMR when the launcher supplies `profileContext` (`dsh-hmr/README.md:27`), which
`dsh web` does. With HMR, config changes and manager operations recompose the live tree; installed
files changed on disk are replaced at the next recomposition; a replacement that fails to import
**stops the previous plugin** and reports `failed` (`:49`). Without HMR, operations return
`restart-required` (`dsh-plugin-manager/README.md:31`). Consequence: the ledger plugin must keep
**no state in memory** — assume it can be stopped under you.

### 3.4 What a plugin can do that a scheduled prompt cannot

A plugin is in-process Node outside the workspace sandbox (`dsh-plugin-manager/README.md:31`), so
`fetch`, DB drivers, `node:child_process`, file writes and `systemd-cat` are ordinary code. The
DSH-provided pieces:

| Capability | API |
|---|---|
| own timers | `ctx.timeout(cb,ms)`, `ctx.interval(cb,ms)`, disposable (`cordis-plugin-timer/README.md:27-30`) |
| durable typed storage | `defineDomain({name,version,tables:{…domainTable(zod)}})`, `await ctx.storageDomain.open(spec)` (`dsh-storage-domain/README.md:36-58`) |
| locks | one per-domain write chain serializes `put/update/delete` (`:88-89`) — a lease record suffices |
| observe sessions | `ctx.on('session/event', (session, event) => …)` (`dsh-session/lib/types/index.d.ts:63`) |
| drive schedule | `create/list/view/history/run/edit` (`dsh-schedule/lib/types/index.d.ts:98-177`) |

### 3.5 Can a plugin observe a scheduled turn's OUTCOME? Yes — this closes the gap

1. A receipt is `{ scheduledAt, deliveredAt, messageId, targetSessionId }`, queryable through
   `ctx.schedule.history({id})` (`dsh-schedule/lib/index.js:1044-1058`;
   `dsh-schedule/lib/types/index.d.ts:127`).
2. The reminder enters the Session as `user/message` whose `id` **is** that `messageId` — message
   identity is stable across representation boundaries (`dsh-llm/lib/types/message.d.ts:124-133`)
   and the service stores the created message's id (`dsh-schedule/lib/index.js:1381-1393`).
3. The consuming turn closes with `turn/end` carrying `reason.kind === 'error'` on failure
   (`dsh-session/lib/types/types.d.ts:279-282`, `dsh-agent-loop/lib/index.js:809-824`).
4. A plugin sees both events on `session/event`
   (`dsh-session/lib/types/index.d.ts:63`).

Match `user/message.id` to the receipt, latch the turn, read the `turn/end` reason. That turns "a
message was delivered" into "this occurrence succeeded or failed", with zero model involvement —
which is why the recommendation is a plugin and not a better prompt.

## 4. Capability matrix

| Dimension | Scheduled prompt | Custom plugin |
|---|---|---|
| Runs without provider | **no** — the turn is a model call | **yes** |
| Delivery durability | strong (inbox + flush + receipt) | n/a — it *is* the code |
| Execution guarantee | none (receipt ≠ outcome) | process ran, or it did not |
| Retry | only LLM-level inside one turn | author-controlled backoff |
| Error visibility | durable `turn/end`; **no alert** | whatever you write |
| Idempotency | must live in the prompt | key + ledger, cheap |
| Cross-task locking | none | storage-domain lease |
| Overlap control | per task, reused Session only; `new` uncapped | full |
| Cadence | RRULE, bounded, ≥1 min | `ctx.interval`, anything |
| Durable state | the transcript, implicitly | typed, queryable domains |
| Judgement / ambiguity | **its entire purpose** | possible, but you'd re-implement an LLM |
| Cost per run | full agent turn | ~0 |
| Debuggability / blast radius | a transcript; full preset toolset | logs + ledger; exactly the code you wrote |

Division of labour: the plugin owns *whether and when*; the prompt owns *what to do when judgement
is genuinely required*.

## 5. Substrate per cadence class

| Class | Examples here | Substrate | Why |
|---|---|---|---|
| Continuous / event-driven | torrent completion → import, playback, file arrival | **Plugin** watcher/poller → Mediarr call | cannot depend on a model; the 60 s schedule floor is the wrong shape |
| Hourly, deterministic | wanted-search, subtitle-wanted-search, RSS sync, queue health | **Mediarr's scheduler** where it exists, plugin timer otherwise; **no LLM** | pure I/O + policy; a model adds cost, latency and a failure domain for zero judgement |
| Daily, judgement | what to acquire next, ranking, prune decisions | **Scheduled prompt** (`new_once`) wrapped by the ledger + watcher | real judgement; reused Session gives "what I queued yesterday" |
| Daily/weekly, deterministic | `downloads-tidy`, reconcile, backup, prune-candidate computation | **Plugin** | the old prompt was a rules engine written in English — a bug, not a design |
| Weekly, judgement | discovery sweep, music curation, recommendations | **Scheduled prompt** (`new_once`) + ledger; `always`-mode retry tolerable | low frequency, high ambiguity, tolerant of retry |
| Meta / all classes | dead-man, ledger, alerting, idempotency | **one small plugin** | §3.5 |

Rule of thumb: **if you can write the acceptance check, it does not need an LLM.** All four Hermes
jobs violated this and paid 25 % failures for it.

## 6. Concrete reliability design

### 6.1 Idempotency keys

Primary key `(task_id, occurrence_at)`, present in both the framing
(`dsh-schedule/lib/index.js:892-900`) and the receipt (`:1044-1058`), so no free-text parsing.
Ledger table `runs` keyed `` `${taskId}@${occurrenceAt}` ``. Because delivery is at-least-once
across a crash (`dsh-schedule/README.md:280`), every prompt opens with: *look up this key; if `ok`,
stop and say so*. The plugin writes the ledger; the prompt only reads it. Side-effecting Mediarr
calls carry the same key as their idempotency token.

### 6.2 Lock / overlap policy

Intra-task is free for reused targets; for `new` targets set `newSessionIntervalSeconds` ≥ expected
duration (`dsh-schedule/README.md:59`) as the concurrency bound. Inter-task: one `locks` table,
`{holder, taskId, acquiredAt, expiresAt}`, acquired through the serialized write chain
(`dsh-storage-domain/README.md:88-89`), TTL > p99 runtime, steal only on expiry and alert the
steal. Media *writes* (prune, delete, move, import) take one shared `library` lock, not per-task
locks, because they all mutate the same tree; reads take none.

### 6.3 Retry / backoff

Two levels, never conflated. **Model-level, inside one turn**: `retryPolicy` on the provider row
(`dsh-llm-retry/README.md:50`) — daily judgement jobs want `always` so a 20-minute provider wobble
does not consume the day's only attempt; hourly jobs want normal mode and let the next hour be the
retry. **Work-level, in the plugin**: on `turn/end.reason.kind === 'error'` record the failure and
re-run at most twice with backoff (+5 min, +15 min), only for retryable codes
(`TIMEOUT|SERVER|TRANSPORT|RATE_LIMIT`), via `ctx.schedule.run({id})` which delivers without
moving the next occurrence (`dsh-schedule/lib/index.js:1187-1228`). Auth/404/config errors alert
immediately and never retry. Hard cap three attempts per occurrence; a fourth is an alert, not a
loop.

### 6.4 Missed-run / dead-man detection

The substrate will not report it. Keep per-task `{lastDeliveredAt, lastOutcome, lastOutcomeAt}`;
every minute compare `now - lastOutcomeAt` against a configured `maxGapSeconds` (a static config
map — do not re-derive RRULE), and on overrun emit one `stale` alert, re-alerting at most hourly.
On Host start, compare `lastDelivery.deliveredAt` with wall clock: a gap larger than the cadence
proves downtime and collapsed occurrences (`dsh-schedule/README.md:12,285`) ⇒ a `host-was-down`
alert carrying the gap, plus one `run()` if `catchUp: true`. Alerts leave through a
provider-independent channel (file, desktop notification, webhook); a channel that needs the LLM
is not an alert channel.

### 6.5 Run ledger

Domain `media-automation`, `version: 1` (`dsh-storage-domain/README.md:36-45`); writes are durable
before resolving and emit `domain/changed` (`:41-58`).

`runs` (key `"<taskId>@<occurrenceAt>"`): `{taskId, occurrenceAt, deliveredAt, messageId, sessionId,
turn?, startedAt?, endedAt?, outcome: 'delivered'|'ok'|'error'|'timeout'|'abandoned', errorCode?,
errorMessage?, attempts}` · `locks` (key `"<lockName>"`): `{holder, taskId, acquiredAt, expiresAt}` ·
`alerts` (key `"<ulid>"`): `{at, kind: 'error'|'stale'|'host-was-down'|'lock-steal', taskId?,
occurrenceAt?, detail, deliveredVia}`

The ledger — not the Session log (a transcript) and not the task record (no outcome field) — is the
only place "did it work" is answered.

### 6.6 Measurable definition of "error-free"

| Metric | Target | Source |
|---|---|---|
| Attribution rate | 100 % of occurrences have a terminal `outcome` | `runs` vs `ctx.schedule.history()` |
| Detection latency | 100 % of failures alerted < 3 min | `alerts.at - runs.endedAt` |
| Silent misses | 0 occurrences with neither ledger row nor alert | reconciliation, §6.4 |
| Duplicate side effects | 0 per idempotency key | ledger `attempts` + Mediarr state |
| Host availability | ≥ 99 % of minutes; 100 % of occurrences attempted or alerted | `Restart=always` + ledger |

For `spec.md`: with a provider that can be down, "error-free" can only mean **"never silently
wrong"** — every occurrence succeeded, was retried, or produced an alert. That is achievable;
"always succeeded" is not.

## 7. Minimal installable skeleton

> **UNVALIDATED** — none of §7 was installed or run; the live profile was untouched and the paths
> are `/tmp` throwaways. Treat every command as a proposal to validate on a copy.

### 7.1 Package

```
/tmp/dsh-media-automation/{package.json, cordis.patch.yml, lib/index.js}
```

`package.json` carries `"type":"module"`, `"main":"lib/index.js"`,
`"dsh":{"bundle":{"patch":"./cordis.patch.yml"}}` (§3.1), and peers pinned to the running version
(`cordis ~4.1.0`, `dsh-schedule`, `dsh-storage-domain`, `dsh-session` all `0.2.2-rc.1`), which the
installer enforces (`dsh-plugin-manager/README.md:77`).

`cordis.patch.yml`:

```yaml
- insert:
    - id: media-automation
      name: 'dsh-media-automation'
```

`lib/index.js` (shape only; ~120 lines when real):

```js
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'

const spec = defineDomain({
  name: 'media-automation', version: 1,
  tables: {
    // per-task state; see §6.5 for the exact fields
    runs: domainTable(z.object({ taskId: z.string(), occurrenceAt: z.string(),
      messageId: z.string(), outcome: z.enum(['delivered','ok','error','timeout','abandoned']),
      errorCode: z.string().optional(), endedAt: z.string().optional() })),
    alerts: domainTable(z.object({ at: z.string(), kind: z.string(), detail: z.string() })),
  } })

export const name = 'media-automation'
export const inject = ['schedule', 'sessions', 'storageDomain']

export function apply(ctx, config) {
  let domain
  ctx.effect(() => {                      // open once, close on unmount
    ctx.storageDomain.open(spec).then((d) => { domain = d })
    return () => domain?.close()
  })
  ctx.on('session/event', (session, event) => {
    // delivery: user/message id matches a receipt messageId -> runs[].delivered
    // outcome:  turn/end reason.kind === 'error' -> runs[].outcome = 'error'
    //           -> alert unless retryable and attempts < 3 (§6.3)
  })
  ctx.interval(() => { /* §6.4 reconciliation */ }, 60_000)
}
```

Two spots are deliberately under-specified because I did not verify them and will not invent them:
the runtime envelope of `SessionEvent` (the listener type is `(session, event: SessionEvent) =>
void`, `dsh-session/lib/types/index.d.ts:63`, but I did not read its discriminant) and the
`ctx.effect` disposer contract. Verify both in `$ROOT/dsh-session/lib/types/types.d.ts` first.

### 7.2 Install

```sh
dsh plugin --profile web add link:/tmp/dsh-media-automation
# or: plugin_manager({ action: 'install_bundle', target: 'link:/tmp/dsh-media-automation' })
dsh --profile web --dump-config | grep -A3 media-automation    # read-only confirmation
```

### 7.3 Host boot persistence — the missing keystone

The Host today is `node /home/daniel-bo/.local/bin/dsh web`, PID 2473142, launched from a terminal
(`pts/2`) — verified this session by `ps aux` and `ss -ltnp`. It is **not** a systemd unit; the
user units present are `fetch-monitor`, `hermes-gateway`, `jellyfin-go`, `mini-jellyfin`,
`transmission-daemon`. Closing that terminal stops all scheduling. Proposed unit at
`~/.config/systemd/user/dsh-host.service` (**UNVALIDATED**, not written):

```ini
[Unit]
Description=DSH Host (web profile) - scheduler and agent runtime
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/Desktop/mediarr
Environment=PATH=%h/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=%h/.local/bin/dsh web --no-open --port 3080
Restart=always
RestartSec=5
TimeoutStopSec=120

[Install]
WantedBy=default.target
```

```sh
systemctl --user daemon-reload
systemctl --user enable --now dsh-host.service
sudo loginctl enable-linger "$USER"
```

Flag basis: `--no-open`, `--port`, `--host` are the web app's own flags
(`dsh-web-app/README.md:37-38,51`). **No quiet long-running mode exists**: `headless` is one task
per invocation then exit (`dsh-headless/README.md:12`), the SDK/ACP bundles are for embedding, and
the only long-lived Host is `dsh web`, which binds a port and prints a tokenized URL
(`dsh-web-app/README.md:41`). `--no-open` suppresses the browser, not the listener. `Restart=always`
restarts a crashed Host but does not recover an hour of downtime — occurrences still collapse
(§1.3), which is what the ledger's `host-was-down` alert is for.

## 8. Validated vs unvalidated

| Claim | Status | Evidence |
|---|---|---|
| Delivery semantics, targets, floors, overlap, at-least-once | **VALIDATED** (read) | §1 |
| `turn/end` carries a typed error reason | **VALIDATED** (read) | `dsh-agent-loop/lib/index.js:809-824` |
| Plugins receive `session/event (session, event)` | **VALIDATED** (read) | `dsh-session/lib/types/index.d.ts:63` |
| Receipt `messageId` == delivered `user/message.id` | **VALIDATED** (read) | §3.5 |
| `ctx.schedule.run()` re-delivers without moving the occurrence | **VALIDATED** (read) | `dsh-schedule/lib/index.js:1187-1228` |
| Bundle shape, patch dialect, install entry points, HMR | **VALIDATED** (read) | §3.1-3.3 |
| Host is unmanaged (terminal-launched, no unit) | **VALIDATED** (ps/systemctl) | §7.3 |
| Skeleton compiles/mounts; `link:` install works; unit boots | **UNVALIDATED** | none run |
| `SessionEvent` envelope used in §7.1 | **UNVALIDATED** | discriminant not read |
| Effective provider `retryPolicy` here | **UNVALIDATED** | no `retryPolicy` in `cordis.patch.yml`, so default normal mode applies; default model row is `moonshotai-cn/kimi-k2.6`, not a DeepSeek route |

## 9. Open questions for the owner

1. **Context accumulation.** `this_session`/`new_once` grow a transcript forever. Accept that for
   daily judgement jobs, or should the plugin rotate the target Session quarterly?
2. **Alert channel.** The only channel that survives a provider outage is local (file, desktop
   notification, `systemd-cat`). Local file, or an outbound webhook adding a non-model network
   dependency?
3. **Catch-up policy.** A three-day outage yields one run. For which tasks is one catch-up run
   correct, and for which is "skip and tell me" correct?
4. **May the Host be a systemd user unit with `enable-linger`?** This answer sets the ceiling on
   every number in §6.6.
5. **Which jobs keep an LLM at all?** `downloads-tidy` should become deterministic code and never
   call a model; `media-orchestrator`'s ranking is the only genuine judgement. That deletion is the
   largest reliability win available and belongs in D1–D4, not here.

# Spec — Re-derive media automation from first principles

**Track:** `chore_migrate_hermes_automation_20261107`
**Opened:** 2026-11-07 · **Revised:** 2026-11-07 (v2: jellyfin-go deprecated → intent-first redesign;
**v3: owner feedback — agent-first web automation, separate Adult and YouTube libraries, Music from
YouTube with an iTunes-style player**).

## Context

The household media pipeline runs on Hermes: four LLM cron jobs and one systemd timer. Measured
reality (`inventory.md`): 167 executions, 42 failures — every failure a model-provider outage, none
of them noticed by the system itself.

Those jobs were built against **jellyfin-go**, now deprecated. They drive it over HTTP `:8097` and
read its SQLite database directly; that entire surface is going away. Mediarr — the server in this
repo — is the media server going forward.

The old system's real mistake was not using a model. It was that **model failures were invisible**
and that web work was wrapped in fragile DOM/regex scripts. v3 keeps LLM judgement but gives every
run a receipt, an outcome ledger, retries, diagnosis and an alert path.

## Principle

**Derive the schedule from intent, not from the old scripts.** For each behaviour ask: what outcome
does the owner need, how quickly must it be true, what happens if nothing runs for a day, and is a
language model actually required?

**Interface stability decides the substrate** (owner feedback, 2026-11-07):
- Stable API / maintained CLI / local files → deterministic code (Mediarr scheduler, plugin jobs).
  These do not break when a website changes.
- Rendered web UI we do not control (TPB, YTS, EZTV, YouTube, adult sources) → **agent + browser
  tools** (kimi-webbridge over MCP). Never write our own DOM scraper.
- Judgement across sources → agent.

The old doctrine survives in corrected form: judgement stays with the agent; scripts do pure I/O
with maintained tools and fail loudly; no `&&` chains pretending to reason; no approval forms.

## Goal

A media automation layer where every recurring behaviour has a justified cadence, a named owner
(Mediarr native task, DSH agent run, or DSH plugin job), an idempotency key, a proof-of-run artifact,
and a failure signal the owner sees without having to notice a missing report.

## Scope

**In:** the four Hermes cron jobs and their skills; `fetch-monitor.timer`; the browser bridge
(`kimi-webbridge`) as the agent's web surface; `yt-dlp`/`beets` as maintained tools; the artifact
contracts in `~/media-reports/`; the DSH substrate (scheduled agent runs + one plugin + a watchdog);
new media domains for Adult, YouTube and Music (scoped as their own tracks); cut-over and
decommissioning.

**Out:** jellyfin-go stability; rebuilding the old scrape scripts; music/YouTube/adult product
implementation inside this track (their own tracks, driven by this automation layer).

## Target shape (RATIFIED 2026-11-07, revised v3)

| Class | Examples | Owner | Model? |
|---|---|---|---|
| Continuous / event-driven | import, subtitle attach, playback, seeding, indexer backoff | Mediarr in-process | never |
| API-shaped deterministic | RSS, wanted search, subtitle fetch, scan, update check, tidy, receipts, retention, quarantine | Mediarr native + DSH plugin jobs | never |
| **Web-facing acquisition & judgement** | daily watch-next + wanted fetch on TPB/YTS/EZTV, YouTube subscriptions, music discovery, adult discovery, subtitle judgement | **DSH scheduled agent runs + kimi-webbridge MCP** | **yes — a few deliberate calls** |
| Meta / reliability | ledger, retry, alerts, heartbeat, dead-man | DSH plugin + systemd watchdog | never |

**"Few agent calls" replaces "massive numbers of scripts":** one daily media orchestrator, one
weekly music run, one weekly adult run, one monthly rules review. The 15 old scripts collapse to
maintained CLIs (`yt-dlp`, `beets`) plus a small bookkeeping layer.

## Decisions (resolved with the owner)

| # | Decision | Answer | Rejected / superseded |
|---|---|---|---|
| D1 | Runtime split | **More work in DSH**: plugin owns the automation layer; Mediarr keeps engine-coupled tasks; deterministic DSH work is plugin code | Everything as model turns (reintroduces invisibility); everything in Mediarr (not the owner's choice) |
| D2 | Library scope | **Separate Adult library** (own root/UI), **YouTube series library**, **Music from YouTube**. Each is its own scoped track: `feature_adult_library_20261107`, `feature_youtube_library_20261107`, `feature_music_library_20261107` | v2's "adult folds into Movies" and "music dropped/outsourced" (owner corrected 2026-11-07) |
| D3 | Web dependency | **Agent + browser-use (kimi-webbridge MCP) is preferred** for rendered web UIs; maintained tools/APIs where they exist; no custom DOM scraper | v2's "indexers only, drop browser" (over-corrected; removed the adaptation the owner wants) |
| D4 | Reliability bar | **"Never silently wrong"**: every expected run succeeded, was retried, or alerted — with the agent's diagnosis attached | "Always succeeds" (impossible with a provider that can be down) |
| D5 | Browser substrate | **kimi-webbridge mounted as an MCP server** (`@deepseek-ai/dsh-mcp-client`, stdio), tools named `mcp__webbridge__*`; Chrome + extension + existing VPN profile | Playwright-MCP only if the bridge proves unstable |
| D6 | Agent cadence | **Daily 03:00 media orchestrator; weekly music (Sun 03:00); weekly adult (Sun 04:00); monthly rules review** | Hourly/daily model turns in API work (no benefit, adds provider risk) |
| D7 | Torrent engine | **Mediarr's built-in WebTorrent 2.8.5 engine**; agent actuates via Mediarr's APIs. No external client, no rtorrent, no torrent MCP. Transmission is disabled once its active torrent finishes and one magnet is validated end-to-end through Mediarr | External `downloadClientId` is accepted but unused (`MediaSearchService.ts:902`); a Transmission adapter would duplicate state for no benefit |
| Q7 | Prune deletion | **Quarantine-then-delete unattended**: 14-day retention, manifest, restore, safety rails, cap, dry-run week | Heuristic deletion (banned); candidates-only (superseded by owner's safety-net choice) |
| Q8 | Host | **Systemd user unit with `DSH_PERMISSION_MODE=danger-full-access`**, one host on :3080 | Workspace-write (scheduled turns cannot answer approvals) |
| Q9 | Watch-next | **Report + `Watch Next` collection** in Mediarr (Collections API) | Report only; auto-add to wanted |

## Requirements

- **FR-1 Intent-first:** every scheduled behaviour traces to a stated intent, freshness tolerance
  and failure signal — not to "the old job did this".
- **FR-2 Single owner:** no behaviour is implemented twice (Mediarr task *and* agent run).
- **FR-3 No decision scripts:** judgement stays in an agent; scripts use maintained tools, do pure
  I/O, and exit non-zero on failure. No custom DOM parsers.
- **FR-4 Observable runs:** each run leaves a durable receipt and a failure that is visible without
  reading logs; agent runs additionally record the agent's diagnosis.
- **FR-5 Idempotent + non-overlapping:** re-running must not duplicate work; two runs must not
  overlap (one occurrence key; one in-flight run per behaviour).
- **FR-6 Survives a dead model for API-shaped work:** deterministic hourly/daily functions keep
  working during a provider outage. Web-facing agent runs are retried and alerted instead.
- **FR-7 Reversible:** the Hermes media path is disabled, not deleted, until one clean week passes.
- **FR-8 Versioned prompts:** agent prompts live in the repo (`automation/prompts/`).
- **FR-9 Browser-use is first-class:** the agent drives kimi-webbridge for web surfaces; a dead
  bridge is an alert, never a silent hang.
- **FR-10 Quarantine safety:** no unattended deletion without a manifest; reversible window; rails
  and caps; dry-run first.
- **FR-11 New domains:** Adult, YouTube and Music are separate tracks; this track's automation must
  skip absent domains gracefully and never depend on jellyfin-go.

## Acceptance criteria

1. Every inventory row has a successor or a recorded drop decision.
2. One clean week: every expected run produced its receipt; zero silent misses; a provider outage
   and a browser failure each produce an alert (not a missing report).
3. `~/media-reports/` keeps its filenames and shapes.
4. The Hermes jobs and `fetch-monitor.timer` show successors in place; rollback is tested once.
5. `measure/tracks.md` and `tech-debt.md` record what was dropped and why.
6. Quarantine is proven safe: restore byte-identical; deletion only after retention and manifest;
   rails reject an active torrent.
7. No runtime component calls jellyfin-go; no custom DOM scraper exists in the tree.
8. Adult, YouTube and Music tracks are registered with specs and plans; their automation is wired
   through the same agent-run/ledger mechanism.

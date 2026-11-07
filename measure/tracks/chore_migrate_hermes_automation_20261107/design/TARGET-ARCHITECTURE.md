# Target architecture v3 — agent-first media automation

**Status:** v3, revised 2026-11-07 from owner feedback on v2. Supersedes v2.
Inputs: three independent designs ([`intent-cadence.md`](./intent-cadence.md),
[`dsh-substrate.md`](./dsh-substrate.md), [`mediarr-contract.md`](./mediarr-contract.md)),
graded against source, plus the owner's correction of the automation philosophy.
No production service, task or profile was modified to produce this document.

## 0. What changed, and why

The owner rejected v2's browser removal and its "deterministic scripts everywhere" bias:

> most deterministic work is fragile and breaks often if we script based on website DOM and/or
> regexes … I chose to use LLM intelligence to adapt automatically … we are moving from massive
> numbers of scripts to a few agent calls.

That is correct, and it moves the dividing line. v2 optimised for provider-independence and
therefore over-rotated: it removed the browser and would have rebuilt web work as scripts. The
fragile part was never "scripts" as such — it was **our own parsers of rendered web UIs**.

## 1. The principle: interface stability decides the substrate

| Interface we must talk to | Substrate | Why |
|---|---|---|
| Stable API / local file / maintained CLI (Mediarr REST, transmission RPC, indexers, `yt-dlp`, `beets`, filesystem) | **Deterministic code** — Mediarr scheduler or plugin job | These do not change when a website's DOM changes. No model, no provider risk. |
| Rendered web UI we do not control (TPB, YTS, EZTV, YouTube pages, adult sources) | **Agent + browser tools** — kimi-webbridge over MCP | The agent adapts to layout/text changes and reports *why* something failed; a selector script cannot. Never write our own DOM scraper. |
| Judgement across sources | **Agent** | Ranking, taste, "is this the right release", "which sub pack" — no rule generalises. |

Consequences:
- **A few agent calls replace many scripts.** One daily media orchestrator, one weekly music run,
  one weekly adult run, one monthly rules review. The old 15 scripts / 4,966 LOC become maintained
  tools (`yt-dlp`, `beets`) plus a small bookkeeping layer.
- **No model in API-shaped loops.** `wanted-search`, RSS, subtitle fetching, scan and import stay
  deterministic native tasks; they were never the fragile part.
- **Browser work is first-class**, not a fallback: the daily agent drives the browser bridge.

## 2. Execution classes

| Class | Examples | Owner | Model? |
|---|---|---|---|
| Native deterministic | import, subtitle attach, playback, seeding, indexer backoff, RSS/wanted search, scan, update check | Mediarr in-process | never |
| **Agent browser-use runs** | daily orchestrator (watch-next, wanted + web fetch, YouTube subscriptions, subtitle judgement), weekly music, weekly adult, monthly rules | DSH scheduled task + kimi-webbridge MCP | yes — deliberate |
| Deterministic bookkeeping | retention deletion, tidy, receipts, ledger, quarantine, dedupe, watchdog | DSH plugin timers + maintained CLIs | never |
| Weekly judgement (folded) | watch-next ranking, prune proposals, rule review | the agent runs above | yes |

**The old failure mode is not "the model was used".** It is that the model's failures were
invisible. v3 keeps agent calls but gives every one a receipt, an outcome ledger, retries and an
alert path (§5).

## 3. The schedule

### Continuous — native
Import on `torrent:completed`; subtitle attach on import; playback progress; seeding retire;
indexer backoff; auto-grab on `release:stored`. No timer, no model.

### Hourly / short interval — native + plugin verification
`wanted-search` 60 min; `subtitle-wanted-search` 10–15 min (knob fix first); `rss-sync` 15–30 min;
plugin verifies Mediarr task receipts every 5 min. No model.

### Daily
| Time | Behaviour | Owner | Model? | Proof |
|---|---|---|---|---|
| 02:00 | library scan + metadata backfill | Mediarr | never | scan summary |
| **03:00** | **daily media orchestrator** — predict what to watch next, search the web (TPB/YTS/EZTV) for wanted/predicted titles, queue the picks, check YouTube subscriptions, judge subtitle needs, write the report | **DSH agent + browser** | yes (1 call) | `YYYY-MM-DD.md` + `recommendations-*` + agent ledger |
| 04:00 | auto-update check | Mediarr | never | task row |
| 04:30 | downloads tidy (library-proof deletion only) | plugin | never | `downloads-tidy-*` |
| 04:45 | retention sweep — delete YouTube episodes watched > 7 days ago; quarantine expiry | plugin | never | retention manifest |
| 05:00 | nightly receipt | plugin | never | `YYYY-MM-DD.md`, sub-priority, missing-subs |
| every 1 min | plugin heartbeat | plugin | never | heartbeat file |

### Weekly / monthly
| Time | Behaviour | Owner | Model? |
|---|---|---|---|
| Sun 02:00 | database backup trigger | plugin | never |
| **Sun 03:00** | **music run** — discover/pick on YouTube, download audio via `yt-dlp`, tag via `beets`, report | **DSH agent + browser + CLIs** | yes (1 call) |
| **Sun 04:00** | **adult run** — browse sources, queue 1–3, name prune candidates | **DSH agent + browser** | yes (1 call) |
| monthly | rules review (quality profile / custom formats) — proposals only | DSH agent | yes (1 call) |

### Human — on demand
Add + search now, override, retry import, restore from quarantine, delete, ask what happened.

## 4. New media domains (owner request)

| Domain | What it is | Why it is a separate track |
|---|---|---|
| **Adult** | a separate library (own root, own UI section, own retention) — not folded into Movies | Mediarr's model is `TV\|MOVIE`; the owner wants it easily accessible, and its discovery/prune profile differs |
| **YouTube** | a library of subscribed channels/playlists; new entries downloaded with `yt-dlp`; an episode is deleted after it has been watched and ~7 days have passed | New library type, a subscription table, retention semantics, its own UI section |
| **Music** | artists/albums/tracks, sourced from YouTube (`yt-dlp` audio), tagged (`beets`/MusicBrainz), played in an iTunes-style, D-pad-navigable client | No music domain exists at all; needs schema, scan, player, client |

Tracks: `feature_adult_library_20261107`, `feature_youtube_library_20261107`,
`feature_music_library_20261107` (already scoped; expanded for YouTube ingest and the player).
The migration layer drives them through the same agent runs; no separate orchestrators.

## 5. Reliability for agent runs ("won't silently fail")

Lifecycle of one agent call:

1. DSH delivers the scheduled prompt; the plugin records delivery and the occurrence key.
2. The agent works: browser tools (`mcp__webbridge__*`) for web surfaces, shell for maintained CLIs,
   Mediarr API for actuation. Browser tools return structured success/failure — a page that
   changed, a login wall, a VPN block is an explicit error the agent can see and retry differently.
3. The agent writes a receipt (what it attempted, what it queued, what failed, and **why**) and
   ends the run.
4. The plugin reads the consuming `turn/end` and records the outcome.
5. On failure: retry (at most twice, transient codes only), then alert with the agent's own
   diagnosis (DOM change / login / CAPTCHA / VPN / tool error). The next run adapts — that is the
   whole point of using an agent.

What each failure looks like:

| Failure | Visible as | Recovery |
|---|---|---|
| model provider down | `turn/end` error in the plugin ledger | retry ≤ 2, alert, next scheduled occurrence catches up |
| browser bridge down | MCP tool error in the run; receipt names it | alert; the agent's next run retries; bridge supervised as a service |
| website changed / login / VPN | agent reports the cause in the receipt and alert | agent adapts next run; no selector script to repair |
| `yt-dlp`/`beets` breakage | tool error in the receipt | agent retries and can update `yt-dlp`; alert if unresolved |
| run never happened (host down) | watchdog: missing receipt/heartbeat | alert ≤ 10 min; catch-up on next start |
| bookkeeping job failed | plugin `jobs` outcome | retry, then alert |

**No silent failure** is the invariant: every expected occurrence ends in a receipt, a retry, or an
alert. The plugin is the observer; the watchdog covers the plugin/host itself.

**"Auto-fix" policy.** Browser work self-adapts. Maintained tools are updated, not patched by us.
If a deterministic adapter ever fails, the alert carries the tool error and the next agent run
proposes the fix; we do not maintain a graveyard of selectors.

## 6. Substrate

### 6.1 Browser-use: kimi-webbridge over MCP (no Hermes)

`kimi-webbridge` is a Chrome-extension bridge that also runs an MCP server. DSH's MCP client mounts
it as native tools, so the agent gets `mcp__webbridge__navigate`, `..._click`, `..._type`,
`..._screenshot` etc. without Hermes:

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml (added alongside the llm-pi-ai providers)
- id: mcp-webbridge
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: webbridge
    transport: stdio
    command: /home/daniel-bo/.nvm/versions/node/v24.18.0/bin/kimi-webbridge
    args: ['mcp']
```

Requirements: Chrome running with the Kimi WebBridge extension (`fldmhceldgbpfpkbgopacenieobmligc`);
the bridge's WebSocket on `ws://127.0.0.1:10086/ws`; the Chrome profile's VPN (Astrill) for TPB.
Start the bridge as a supervised unit (or let the plugin spawn it) and probe it before each agent
run; a dead bridge is an alert, not a silent hang.

### 6.2 Maintained tools, not scripts

- `yt-dlp` (2026.08.19 available in the Hermes venv today; install a standalone current copy) —
  lists playlists, downloads video/audio, embeds metadata. It is a maintained extractor, not our
  DOM code; when YouTube changes, `yt-dlp -U` fixes it.
- `beets` + MusicBrainz for tagging/organising music; `ffmpeg` for audio conversion.
- The old `fetch-from-youtube.py` / `music-tidy.py` are thin wrappers worth keeping as maintained
  CLIs (they are pure I/O); the TPB/YTS/EZTV scrape scripts are **not** revived — the browser agent
  owns those sites.

### 6.3 DSH plugin `media-automation` (bookkeeping, no web parsing)

Timers: tidy 04:30, retention 04:45, receipt 05:00, backup Sun 02:00, reconcile/heartbeat.
Responsibilities: run ledger for agent calls and deterministic jobs; retention deletion (with
manifest); quarantine engine; receipts; alert webhook; watchdog companion. It never scrapes a
website.

### 6.4 Host + watchdog

`dsh-host.service` (systemd user, `Restart=always`, port 3080,
`DSH_PERMISSION_MODE=danger-full-access`, linger already enabled). External
`automation-watchdog.timer` every 10 min checks host, bridge, heartbeat, Mediarr health, expected
artifacts and failed tasks; it is the only piece that survives both hosts being down.

### 6.5 Torrent engine — Mediarr's built-in WebTorrent (decided 2026-11-07)

Grabs already go through the internal manager: `MediaSearchService` calls
`torrentManager.addTorrent` (`MediaSearchService.ts:387`, `:794`), and the code states the external
`downloadClientId` is *"accepted but currently not used since we use the internal torrent manager"*
(`:902`). The engine is WebTorrent 2.8.5 (`server/package.json`), initialized in
`TorrentManager.ts:117-133`, with completion → import, stats SSE and `SeedingProtector` wired.
`DownloadClientRepository` supports `transmission|qbittorrent|deluge|rtorrent|…`
(`DownloadClientRepository.ts:10-18`) but no adapter adds torrents — it is configuration only.

**Decision:** keep the built-in engine. No external client, no rtorrent, no torrent MCP/plugin; the
agent drives `POST /api/releases/grab` and `/api/torrents/*`. One owner for torrent state, import,
seeding and the agent-facing API; one fewer daemon.

**Transmission decommission condition** (disabled, not deleted; currently active with four
complete torrents and one at 83.4%): finish or re-add the active torrent, validate one real magnet
end-to-end through Mediarr (progress → complete → import), and disable the old Hermes jobs. Risk to
watch: WebTorrent is pure JS — validate throughput/memory on the first real grab; the fallback is a
Transmission adapter behind the same Mediarr API, never a different automation interface.

## 7. Mediarr changes needed

**Migration-track code changes:** fix the subtitle interval persistence (the only blocking one);
settings (rss 30, subtitles 10–15, wanted 60). Nothing else in Mediarr is required by the
automation layer — it uses existing APIs (wanted/search/grab, torrent control, subtitle
search/upload, playback, collections, task trigger/history, backup).

**New product tracks (not this track):** Adult library (type/root/UI), YouTube library
(type/subscriptions/retention/UI), Music (domain/tagging/player). Each exposes the small API surface
the agent runs need (add subscription, mark watched, list due-for-retention).

## 8. Migration sequence

| Step | Work | Switch off when |
|---|---|---|
| P0 | Deploy Mediarr 24/7; DSH host unit; alert webhook; watchdog skeleton | both survive reboot; watchdog alerts a synthetic miss |
| P1 | Subtitle knob fix + settings; plugin skeleton (ledger/heartbeat/timers) | heartbeat + a no-op job visible 24 h |
| P2 | kimi-webbridge MCP + Chrome/bridge supervision; daily orchestrator prompt (repo-versioned); manual run | one manual run produces receipt + ledger row; a forced browser failure is diagnosed and alerted |
| P3 | Deterministic jobs (tidy, receipt, retention, backup, quarantine dry-run) | one week of artifacts; shadow manifests reviewed |
| P4 | New domains land (adult, YouTube, music) and the weekly agent runs drive them | each domain: a downloaded item is visible, playable, and its retention proven |
| P5 | Disable Hermes jobs + `fetch-monitor.timer` (not delete); archive `jobs.json` | one real import with no manual move; no double grabs |
| P6 | One clean week; rollback test; archive | zero silent misses; provider/browser outages alerted; rollback proven |

## 9. Backlog

| # | Item | Acceptance |
|---|---|---|
| B1 | Mediarr 24/7 deployment | reboot survives; health green; scheduler nextRun present |
| B2 | Subtitle interval fix + settings | interval persists across restart |
| B3 | DSH host systemd unit | reboot survives; scheduled run writes outside repo |
| B4 | Plugin skeleton (ledger/heartbeat/alerts) | installs via `link:`; survives HMR; heartbeat visible |
| B5 | kimi-webbridge MCP + bridge supervision + probe | agent calls a browser tool; dead bridge alerts and does not hang |
| B6 | Daily orchestrator prompt (repo) + manual run | one run: picks queued via browser, receipt with diagnosis, ledger row |
| B7 | Deterministic jobs: tidy, receipt, retention, backup | each artifact + `jobs` row; missed run alerts |
| B8 | Quarantine + retention engine (dry-run first) | manifest-backed move/restore/delete; cap enforced |
| B9 | Watchdog + expectations | host/bridge/plugin/Mediarr down each alert ≤ 10 min |
| B10 | Adult library track | separate root/UI; weekly agent run queues; quarantine prune |
| B11 | YouTube library track | subscriptions download new; watched+7d retention proven |
| B12 | Music track (expanded) | YouTube ingest → tagged files → iTunes-style D-pad player on TV |
| B13 | Cutover + clean week + rollback | zero silent misses; old path re-enabled once |
| B14 | Docs: tracks/tech-debt/lessons | recorded |

B10–B12 are their own tracks; the migration track builds the automation around them and can ship
P0–P9 before they land (the daily agent simply skips domains that do not exist yet).

## 10. Assumptions to confirm (flagged, not hidden)

1. **Adult** is a separate library with its own root and a visible UI section (not hidden behind a
   lock). If it should be gated, say so.
2. **YouTube retention** uses quarantine-then-delete: an episode is moved out when watched, then
   deleted after 7 days; 7 days is configurable.
3. **Music format** defaults to m4a/AAC 256k (fallback mp3 320 for compatibility), tagged via
   beets/MusicBrainz; the player ships TV-first, then the other Flutter targets.
4. **Agent cadence:** daily 03:00 media, weekly music, weekly adult, monthly rules. A provider
   outage delays these runs and alerts; it never falls back to a scraper.
5. **Browser:** kimi-webbridge MCP, with the Chrome profile's existing VPN. Playwright-MCP is the
   fallback if the bridge proves unstable.

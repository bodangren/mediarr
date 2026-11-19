# Standing Goal — Frictionless Media (2026-11-19)

> **Status: ACTIVE.** This goal replaces the daily operator goal ("every day choose something to
> watch, acquire it, file it, keep the pipeline alive, improve one UX area") and supersedes the
> K3.1-authored *Notice First, Make Watching Effortless* goal, which is kept in
> [Appendix A](#appendix-a--predecessor-goal) as inherited discipline.
>
> **Owner's words that created it (2026-11-19):** *"Write a new goal for yourself to iterate on the
> UI/UX until media acquisition and play is basically perfectly frictionaless."*

---

## The goal

Iterate on Mediarr — client, server and operator habits together — until the two journeys below are
**frictionless by measurement, not by opinion**, and keep iterating until there is nothing left to
remove. Every cycle ends with a smaller number than it started with.

### Journey 1 — Acquisition (owner does nothing)

A title the owner wants goes from *not in the library* to *sitting on the Home screen, playable,
with working bilingual subtitles* with **zero owner actions and zero operator reminders**. The
operator notices the gap from watch history, finds a healthy release, downloads it, files it into
`/data` correctly, gets subtitles, and the engine registers it. The client never shows a title it
cannot play.

**Frictionless bar:** new content is playable within 24 h of the pick, with no duplicate copies, no
wrong-episode/order errors, no "missing file" ghosts, no human triage of a stalled torrent, and no
owner ever asking "where is it?".

### Journey 2 — Playback (remote only, in the dark)

TV off → power on → remote in hand → the intended thing is playing, at the right place, with the
right subtitles. Nothing on screen needs explaining. There is no dead end, no control that does
nothing, no second rail to learn.

**Frictionless bar:** power-on → playing in **≤ 3 presses and ≤ 10 s** (hard ceiling: 5 presses /
20 s), resume where the owner left off, first frame within 5 s of Play, correct audio/subtitle
tracks, and a remote-only exit that never requires a reboot.

### What "perfectly frictionless" means (the rubric)

| # | Measure | Frictionless | Weight |
|---|---------|--------------|--------|
| M1 | Presses from power-on to playing | ≤ 3 | 25% |
| M2 | Seconds from power-on to playing | ≤ 10 | 15% |
| M3 | Dead ends / purposeless focus stops on core paths | 0 | 25% |
| M4 | Owner corrections needed (per week) | 0 | 15% |
| M5 | Playable-in-24h for new picks (unattended) | 100% | 10% |
| M6 | Client items that cannot play / wrong content | 0 | 10% |

A cycle may only claim progress on a metric it measured **before and after**, on the real surface
(the TV for M1–M4/M6; the library + DB for M5).

---

## How to iterate (one cycle = one measurable friction removed)

**Cycle shape, in this order — never skip step 1.**

1. **Find the friction by walking it.** Use the real device (adb → D-pad), and the real library.
   Write each stoppage as an entry in `device-20261107/friction-ledger.jsonl`:
   `{ts, journey, step, what_happened, presses_wasted, seconds_wasted, expected, evidence}`.
   A friction you cannot describe as a number is not yet a finding.
2. **Rank.** Highest `presses_wasted + seconds_wasted` on the core path first; owner-named defects
   override the ranking entirely (see *Owner corrections*, inherited).
3. **Fix the smallest thing that removes it.** Client-only → Flutter, APK, install, verify on TV.
   Server-only → engine + tests + `/api/health` + a real client read. Habit-only → change the
   operator procedure and record it in the playbook. Never do two cycles at once.
4. **Verify where it hurts.** TV screenshot before/after (or a real playback start), `flutter test
   --no-pub` + `flutter analyze --no-pub` for client work, `npx vitest run` + `tsc --noEmit` for
   server work. Tests are the floor, the device is the proof.
5. **Re-measure M1–M6** for the touched path, append the delta to the ledger, commit and
   `operator_guard_record`.

**Budget per cycle:** 45 min find+fix, 20 min build/install/verify, 10 min record. If the cycle
cannot land inside that, cut it smaller — a smaller friction removed beats a large one started.

**Convergence rule:** when a full TV walkthrough of both journeys produces **zero** new ledger
entries and the rubric reads frictionless on two consecutive cycles, drop to a weekly regression
walk. The goal retires only after four consecutive weeks at that state.

---

## Escalation: ask Kimi K3.1 on design decisions

Friction removal is not purely mechanical — some fixes are interface design, and the owner has said to
escalate those to **Kimi K3.1 Pro** (`subagent`, provider `kimi-coding`, model `k3.1-pro`) rather than
deciding unilaterally.

Escalate when a fix would change a **pinned or owner-requested behaviour** (player Back semantics,
focus order, HUD timing, rail contents, poster geometry, detail-page action model), when two fixes
conflict, or when the honest answer is "this control should not exist". Do **not** escalate mechanical
defects (a stale cache, a wrong query, a parser gap) — fix those and verify them.

Ask K3.1 for a *decision document*: exact behaviour spec, acceptance in presses/seconds, what must not
change, and a short justification. Ground it in measured evidence from this ledger and state the
non-negotiable contracts plainly. Record its decision in the track plan before implementing, and
implement it as specified — if the measurement later contradicts the decision, escalate again with
the new numbers instead of quietly deviating.

---

## Anti-goals (these look like progress and are not)

- New screens, tabs, settings pages, dashboards, or rail entries. **The rail stays at 8.**
- Adding a feature to solve a friction that removing a control would solve.
- REST clients, API polling, database writes, deletion of media by the operator.
- Cosmetic churn without a before/after measurement; broad redesigns; "polish" nobody asked for.
- Test-only completion claims, screenshots of a desktop window instead of the TV, or reports that
  claim a fix the device has not confirmed.
- Queueing more releases instead of importing, verifying identity, or killing dead torrents.

---

## Inherited, non-negotiable

- **One system.** Harness, server, client are one product; the operator owns all three.
- **The engine owns state.** DB writes and file registration happen through scheduled scans, never
  through automation or REST. Library reads are `sqlite3 -readonly`.
- **Deleting media is owner-only.** Duplicates go to `/data/_quarantine/` with a manifest.
- **Every run changes state or names a blocker.** Status prose alone is a defect.
- **Pinned contracts:** 6 poster columns / 12 titles per screen; 8 rail destinations; no `TextField`
  (system IME) on TV surfaces; one dominant playback action per detail screen; accent = focus,
  check = selected.
- **Owner-correction discipline:** each time the owner has to name a defect, it becomes a permanent
  first-check next run (portrait-not-banner posters, `S##E##` continue-watching labels, Wanted never
  traps the D-pad, in-app search keyboard, focus≠selection, late-sidecar registration).

---

## First cycle (start here)

Walk the actual remote path **power-on → Home → Continue Watching → Play** and count presses and
seconds, ledger every stoppage, then remove the single largest one. Then walk **Search → a title →
Play** and **Series → season → episode → Play** the same way. That is cycle 1; nothing else starts
until the ledger exists.

---

## Appendix A — Predecessor goal

Authored by Kimi K3.1 Pro at the operator's request on 2026-11-19, titled *Standing Goal: Notice
First, Make Watching Effortless*. Its durable contributions, inherited above: notice defects before
the owner names them; one improvement + one acquisition action per run; verify on the real surface;
track owner corrections as permanent checks; import before acquiring; kill stalls before they age.

Its per-day one-improvement/one-acquisition ritual is now subordinate to this goal's cycle shape:
acquisition continues (Journey 1 must not regress), but the *unit of progress* is a measured friction
removed, not a task completed.

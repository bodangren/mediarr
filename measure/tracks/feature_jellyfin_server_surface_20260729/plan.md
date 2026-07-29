# Plan: Jellyfin-Compatible Server Surface

> Contract-First + TDD per `measure/workflow.md`. Each phase is independently demonstrable on the
> TV, so the track can be stopped at any phase boundary with something working.
>
> **Verification note.** Phases 1-5 are unit-testable. The *client behaviour* they exist to produce
> is not — it depends on a third-party TV app. Each phase therefore has a cheap **curl probe**
> (agent-executable) and a **TV check** (human-gated). Do not mark a phase complete on the curl
> probe alone; record the TV check as `[~]` human-gated where it cannot be run.

## Phase 0: Bring-up and Reversibility

- [x] Record the exact restore command for the owner's existing server before touching it:
      `systemctl --user start thaidub-serve.service` (stop with `systemctl --user stop …`).
      **Stop only — never `disable`.** Confirm `systemctl --user is-enabled thaidub-serve.service`
      still reports `enabled` after our stop. **Verified before work:** `enabled` (2026-07-29).
- [x] Capture a baseline of the TV's actual requests from the existing ThaiDub journal (2026-07-24,
      `192.168.1.121`, Jellyfin Android TV): socket, bodyless query-form capabilities, lower-camel
      Latest/NextUp browse, PlaybackInfo, Range streams, progress heartbeats, and stop were recorded.
- [x] Add a `JELLYFIN_PORT` (default `8096`) and `JELLYFIN_ENABLED` (default off) config seam so the
      surface cannot collide with ThaiDub by accident on someone else's machine.
- [x] Commit: `feat(jellyfin): add configuration seam for the compatibility surface`

## Phase 1: Discovery + Handshake

- [x] Red: unit tests for a UDP responder — encodes the reply for `"Who is JellyfinServer?"`,
      ignores unrelated datagrams, resolves the **LAN** IP (not loopback, not a container address),
      and reuses a stable server GUID across restarts.
- [x] Implement `JellyfinDiscoveryService` as a **sibling** of `DiscoveryService`, not a
      modification: Bonjour publishes records, this must listen on a raw UDP socket and reply.
- [x] Red then green: `/System/Info/Public`, `/System/Info`, `/System/Ping`, `/Branding/Configuration`.
- [ ] Curl probe: `curl -s localhost:8096/System/Info/Public | jq .Id` returns the same GUID as the
      UDP reply.
- [~] **TV check (human-gated):** the TV's "add server" screen finds Mediarr with no typed address.
- [x] Commit: `feat(jellyfin): answer UDP discovery and the server handshake`

## Phase 2: Auth Stub + Library Views

- [x] Red: `/Users/Public`, `/Users/AuthenticateByName`, `/Users/{uid}` satisfy the login flow
      **without adding an authentication system** (FR-3). Assert explicitly that no credential is
      stored and no existing route becomes authenticated.
- [x] Red: `/UserViews`, `/Users/{uid}/Views`, `/Library/MediaFolders` map Mediarr's movie and TV
      libraries to Jellyfin collections with correct `CollectionType`.
- [~] **TV check (human-gated):** the TV logs in and shows two libraries.
- [x] Commit: `feat(jellyfin): serve the login flow and library views`

## Phase 3: Browse

- [x] Decide and document the **stable item-ID scheme** (Jellyfin expects GUID-shaped ids; Mediarr
      uses integer PKs). Ids must survive restarts. Write the mapping test first.
- [x] Red then green: `/Items`, `/Users/{uid}/Items`, `/Items/{id}` with paging, sorting and
      `ParentId` filtering as sent by the client.
- [x] Red then green: `/Shows/{id}/Seasons`, `/Shows/{id}/Episodes`.
- [x] Red then green: `/Items/{id}/Images/{type}`. **Decide proxy vs redirect from observed client
      behaviour** — Mediarr stores artwork as remote TMDB URLs, not local files (FR-6). Record which
      was chosen and why.
      **Implemented: allowlisted in-process proxy; it avoids relying on third-party redirect handling. Physical-TV confirmation remains human-gated.**
- [~] **TV check (human-gated):** browse into a series, see seasons and episodes with artwork.
- [ ] Commit: `feat(jellyfin): enumerate libraries, series, seasons and episodes`

## Phase 4: Playback

- [x] Red: `/Items/{id}/PlaybackInfo` returns a direct-play `MediaSource` pointing at the stream URL.
- [x] Red: `/Videos/{id}/stream` honours `Range` and returns 206. **Reuse
      the shared `api/utils/byteRangeStreaming` parser** — do not write a second Range parser. Add a test that fails
      if the logic is duplicated rather than shared.
- [x] Red then green: `/Sessions/Capabilities`, `/Sessions/Capabilities/Full`, `/Sessions/Playing`,
      `/Sessions/Playing/Stopped`, `GET /Sessions`. Not optional — clients error-loop without them.
- [ ] Curl probe: `curl -r 100-200 -o /dev/null -w '%{http_code}' …/Videos/<id>/stream` → `206`.
- [~] **TV check (human-gated):** play a file and seek forward/backward.
- [ ] Commit: `feat(jellyfin): direct-play streaming with range seeking and sessions`

## Phase 5: Resume and Watched State

- [x] Red: `/Sessions/Playing/Progress` persists via the **existing**
      `PlaybackService.recordHeartbeat` — an adapter, not new storage.
- [x] Red: `/Users/{uid}/Items/Resume` and `/UserItems/Resume` read through the **existing**
      `getContinueWatching`.
- [x] Red: `POST /UserPlayedItems/{id}` marks watched; `/Shows/NextUp` returns the next unwatched
      episode.
- [x] **Cross-surface test (the acceptance criterion that matters):** a position written through the
      Jellyfin path is returned by `GET /api/playback/continue-watching`, and vice versa. One store,
      not two. This is the test most likely to catch a duplicated-state mistake.
- [~] **TV check (human-gated):** stop mid-episode, reopen, resume; confirm the same position in the
      SPA.
- [x] Commit: `feat(jellyfin): resume position and watched state over the shared playback store`

## Phase 6: Container Delivery and Live Verification

- [x] Wire the surface into the container image; confirm host networking is in force (UDP broadcast
      cannot traverse a NAT bridge) and that the fd-limit constraint from
      `chore_home_network_deployment_hardening_20260712` still holds for any new build tooling.
- [x] Verify the image builds clean: `npm run test:clean-image`.
- [ ] Stop ThaiDub (`systemctl --user stop thaidub-serve.service`), run the Mediarr container, and
      perform the full TV walkthrough: discover → browse → play → seek → resume → watched.
- [ ] **Restore ThaiDub** (`systemctl --user start thaidub-serve.service`) and confirm it comes back,
      proving the change was reversible.
- [x] Run gates **after the last edit**: `CI=true npx vitest run server/src tests` (339 files passed, 1 skipped; 3022 tests passed, 14 skipped), `npx tsc -p server/tsconfig.json --noEmit`, and `git diff --check`.
- [ ] Record findings in `lessons-learned.md` / `tech-debt.md`; archive the track.
- [ ] Commit: `docs(measure): close out the Jellyfin compatibility surface track`

## Completion Audit Remediation (reopened 2026-07-29)

- [x] Add contract tests and close known-good system/user DTO, safe PlaybackInfo, and session no-op gaps.
- [x] Add contract tests and close browse/user-state gaps: UserData, Latest, Backdrop policy, NextUp, and episode query semantics.
- [x] Preserve the one-store resume/watched invariant while deciding any unplayed-state compatibility behavior.
- [~] Re-ran `CI=true npx vitest run server/src tests` (333 passed, 1 skipped; 2993 passed, 14 skipped), strict TypeScript, and `npm run test:clean-image` (no-cache image exit 0) after remediation; physical-TV/ThaiDub acceptance remains human-gated.

## Full Reference-Surface Expansion (explicit owner direction 2026-07-29)

- [x] Close session wire-contract gaps: normalize X-Emby/body identity, accept bodyless query-form capabilities, return Jellyfin session DTOs, and persist a final valid stopped-playback position through the shared store.
- [x] Close browse contract gaps: real-TV lower-camel query variants, recursive/type/search filters, accurate Latest and NextUp paging/counts, reachable artwork tags, and availability consistency between catalog and stream resolution. Production catalog now filters leaves through the same non-empty file-variant relation used by PlaybackService; the custom DatabaseClient predicate is regression-tested.
- [x] Add and test the remaining reference routes: Audio stream aliases, Download, socket keepalive, and `/`, `/web`, `/web/` browser entry aliases.
- [x] Route-declaration and protocol-contract parity covers all 52 known-good `serve.py` declarations; final aggregate suite (339 files, 3022 tests), strict TypeScript, diff check, and no-cache clean image (exit 0) all passed.
## Open Questions (resolve during Phase 0, not by assumption)

1. **Which endpoints does *this* TV actually call?** The spec's list is prior art from
   `/media/daniel-bo/320GB/serve.py`. Phase 0's request log replaces it with fact. Expect the real
   list to be shorter in some places and longer in others.
2. **Item ID scheme (resolved):** deterministic UUID-shaped IDs derive from kind plus integer PK, so no migration is needed; stability is unit-tested.
3. **Artwork (resolved):** an allowlisted in-process proxy avoids relying on third-party redirect handling.
4. **HTTPS or stricter server-ID requirements:** still requires physical-TV confirmation; the stable identity persists at `/config/jellyfin-server-id`.

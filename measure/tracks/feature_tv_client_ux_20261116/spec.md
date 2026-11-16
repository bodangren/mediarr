# Spec — TV Client UI/UX Fixes (owner report 2026-11-16)

## Origin

The owner reported seven defects from the living-room device on 2026-11-16, verbatim:

1. "In the series page, poster image frames are portrait, but the images themselves are landscape.
   There's no way to really identify the series by image."
2. "In the individual series page, the title can often be ellipsed (How I met your Mother, for
   instance)."
3. "In the individual series page, navigation with D-pad is not linear. The element hierarchy is not
   visual at all and the focus jumps around the screen and may even appear to be locked into a spot."
4. "In the continue or not at the end of a video, answers can bring up screens which aren't navigable
   at all by D-pad. A mouse is required. (This problem exists across the UI, where the user may get
   locked into a screen and the only way to get out is to reboot the system.)"
5. "All videos should have a badge which indicates whether the required chinese / english subs exist."
6. "The client doesn't appear to hot reload new videos or subs."
7. "In the individual movie page, initial focus is on back and not on play / continue."

## Problem statement

The TV client is the household's primary interface, and its focus model has drifted from its visual
layout. Three of the seven defects (3, 4, 7) are the same underlying fault: focus is left to Flutter's
geometric resolution over a widget tree that does not match the rendered order, and some interactive
surfaces (dialogs, end-of-playback prompt) are built without focusable controls or an escape path at
all. The remaining four are presentation/freshness faults: artwork is framed with the wrong aspect,
titles are clamped to one line, subtitle availability is invisible to the viewer, and library data is
never refreshed after the app starts.

## Requirements

- **FR-1 (poster aspect).** Library grids must frame artwork in the artwork's own aspect: a poster
  card shows a 2:3 portrait image; when only landscape artwork exists it is fitted inside the portrait
  frame (never stretched, never cropped to unrecognisable), so the series is identifiable at a glance.
- **FR-2 (title fit).** The series detail title must render in full. It may wrap to two lines and may
  auto-shrink, but it must not ellipsis for titles of the length of "How I Met Your Mother".
- **FR-3 (linear focus).** On the series detail screen, D-pad Up/Down must move through the screen in
  visual order — Back → primary CTA → action bar → season chips → episode list — and must never leave
  focus on a control with no reachable neighbour in the pressed direction.
- **FR-4 (no focus traps).** Every modal, dialog, bottom sheet and post-playback prompt must be fully
  operable with D-pad alone (all actions reachable) and must have an escape route (Back/Escape) that
  returns to a focused, navigable screen. No state may require a reboot to leave.
- **FR-5 (subtitle badge).** Movie and episode cards/tiles and both detail screens show a badge
  stating Chinese/English subtitle availability (`中英`, `中文`, `EN`, or a missing marker), sourced
  from server truth, not guessed from a file extension at render time.
- **FR-6 (freshness).** After the app resumes or the TV regains focus, library, series and movie data
  refresh without a restart, so newly imported videos and newly fetched subtitles appear.
- **FR-7 (initial focus).** Entering a movie detail screen puts focus on the primary action
  (Play/Resume), not on Back; the same holds for series detail (already true there).

## Acceptance criteria

- `flutter analyze` clean and `flutter test` green for every phase; new behaviour covered by at least
  one widget/unit test that fails before the fix.
- Server change for FR-5 covered by route/service tests and `npx tsc -p server/tsconfig.json --noEmit`.
- Each fix verified against the running app on the TV where the defect was reported; if the device is
  unreachable, the APK is published and the install is recorded as pending, not claimed done.
- `measure/lessons-learned.md` updated with whatever the focus model taught us.

## Out of scope

- SPA (React) equivalents of these defects — this track is the Flutter TV client only.
- Re-designing the home screen (track `feature_tv_home_redesign_20260924` owns that).
- Any change to playback codec/rendering behaviour.

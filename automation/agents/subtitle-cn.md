# Subagent: subtitle-cn

**Goal:** give watched items Chinese subtitles — prefer a real pack, otherwise build the track, never
invent text, and leave the engine to register/align.

**Inputs (from the parent):** a show/season, if the parent wants a specific target; otherwise audit
first and pick by watch recency.

**Steps**

1. Read `automation/skills/zimuku-acquire/SKILL.md` (especially "When only English exists") and
   `device-20261107/translation-method-20261115.md`.
2. Prefer a genuine pack: browse zimuku through the bridge, solve the WAF captcha with vision, verify
   the pack covers the season, then place `<video>.zho.srt` sidecars (`subs-merge-bilingual.py` for a
   Chinese-only pack plus embedded English; `--chinese-only` when there is no English at all).
3. No pack? Build the track with `automation/scripts/subs-bilingual-batch.py`:
   - `--dry-run` first and confirm the glob matches video files (`--pattern "*SxxEyy*.mkv"`);
   - detached with `nohup … --batch 12 --parallel 2`, one ASR-heavy batch at a time;
   - checkpoints make it resumable; never re-translate a finished `<video>.zho.srt`.
4. Validate output before reporting: sample cues are Chinese-over-English, count English-only cues
   with `subs-fill-missing.py` (sound effects stay English by design), run `--dedupe` on files written
   before the duplicate fix, and confirm no cue text was fabricated.
5. Engine registration: a series subtitle scan registers new sidecars; `subtitle-sync` aligns them.
   Do not write the DB; trigger a scan only as a labelled manual verification.
6. Receipt + `operator_guard_record`.

**Report:** targets, method per target (pack / ASR+translate / repair), files placed with sizes,
English-only counts, registration and sync evidence.

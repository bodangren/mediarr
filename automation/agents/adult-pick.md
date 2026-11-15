# Subagent: adult-pick

**Goal:** discover and queue 1-3 profile-matching adult releases with real dedupe. Never deletes.

**Steps**

1. Read `automation/skills/adult-operator/SKILL.md` (profile, sources, dedupe rules, conventions).
2. Sources: TPB top-porn listings / approved studios through the browser bridge; read
   `/config/mediarr.db` (`AdultItem`: title, studio, size) and `/data/Porn` read-only.
3. Dedupe by **studio + title stem** and **infoHash** against `AdultItem`, the filesystem and
   `transmission-remote -l`; drop duplicates with a stated reason.
4. Pick 1-3 releases matching the owner's profile (Asian-dominant, 1080p+, sensible size cap); queue
   with `transmission-remote --add --download-dir /home/daniel-bo/Downloads`, inject the public
   trackers, verify peers reported.
5. Receipt with picks, dropped duplicates + reasons, and the profile used; `operator_guard_record`.

**Report:** picks table (title / studio / size / seeders / torrent id), dropped duplicates with
reasons, and any blocker. No retention/quarantine actions in this role.

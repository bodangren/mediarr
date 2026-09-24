# Specification: Deployment Readiness Caveat Lockdown

## Objective
Remove the five deployment caveats from the 2026-08-15 TV-box bring-up and prove the system is deployment ready.

## In Scope
- Make TMDB v4 support durable through the repository and image build.
- Install ffmpeg in the image. Do not rely on `docker exec apt-get`.
- Replace mode `0777` media roots with a strict ownership/read-write model.
- Make imported movies and episodes show Play when a playable file exists.
- Harden TV series matching and import against stale TVDB identifiers and false matches.
- Run deployment gates: tests, typecheck, builds, image build, fresh-container smoke, backup/restore check.

## Out of Scope
- Authentication and broad security hardening. The trusted-LAN scope stands.
- Music and Porn library import.
- Legacy Kotlin Android TV client work (client deleted 2026-09-20).

## Acceptance Criteria
- A clean image build contains ffmpeg and the TMDB source changes.
- A fresh container starts with host media roots owned by the runtime UID:GID and not mode 0777.
- Startup fails closed when downloads/config are not writable. Media roots may be read-only unless rename or organize is enabled.
- `GET /api/movies` and `GET /api/movies/:id` report `hasFile=true` when a file variant or playable path exists. Flutter detail shows Play for the same item.
- Series import does not accept a TVDB detail 404 as success. It prefers exact title+year matches and records unresolved folders as failed.
- The full automated gates pass or any human-gated item is explicitly recorded.

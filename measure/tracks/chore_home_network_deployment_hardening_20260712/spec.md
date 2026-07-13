# Home Network Deployment Hardening

## Context

The prior Docker-readiness track repaired the legacy Next.js deployment path, but the resulting configuration is not safe to deploy with Docker Engine on an Ubuntu trusted LAN. The worktree contains that uncommitted baseline and scheduler work; this track owns only deployment hardening and must preserve unrelated scheduler changes.

## Requirements

- FR-1: Provide a Docker Engine-compatible compose deployment with effective configurable UID/GID mapping, bind mounts, host networking, and no Podman-only options.
- FR-2: Reject an absent or placeholder `ENCRYPTION_KEY`, and fail startup when `/config` cannot be created or written; never fall back to an ephemeral database.
- FR-3: Replace destructive, ignored schema push behavior with versioned Drizzle migrations that fail the container on migration failure.
- FR-4: Keep secrets and generated/local data out of the Docker build context and add a meaningful container healthcheck.
- FR-5: Document initial setup, trusted-LAN constraints, operational smoke checks, database backup/restore rehearsal, and upgrade/rollback procedures accurately.
- FR-6: Fail startup when any required `/data` storage location is unavailable or unwritable; never report healthy when imports or downloads cannot use their configured persistent paths.
- FR-7: Do not silently replace the torrent engine with a database-only implementation that accepts downloads without transferring data.
- FR-8: Make host migration rehearsal target the same SQLite file as the Docker deployment and reject unsafe legacy migration-history adoption.

## Acceptance Criteria

- [ ] `docker compose config` accepts the supplied `.env` variables using Docker Engine syntax.
- [ ] A container runs as the configured UID/GID and can write both mounted directories.
- [ ] Startup rejects placeholder/missing encryption keys, configuration mount failures, and migration failures.
- [ ] Startup applies tracked Drizzle migrations only; it never uses `drizzle-kit push --force`.
- [ ] Image context excludes `.env`, mounted data/config, and generated artifacts.
- [ ] Health reports readiness only after persistent storage and migration startup requirements succeed.
- [ ] The README gives executable smoke, backup/restore, upgrade, and rollback instructions for a trusted LAN.
- [ ] Startup rejects unwritable configured `/data` download and library paths before reporting readiness.
- [ ] Torrent-engine initialization failure prevents the daemon from accepting fictional downloads.
- [ ] Host migration rehearsal uses `$CONFIG_DIR/mediarr.db`, and legacy baseline adoption verifies the expected schema shape.

## Out of Scope

- Authentication or Internet-facing deployment.
- Building a multi-host backup service; the initial release may prescribe a verified host-managed backup procedure.

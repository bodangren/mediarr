# Specification: Track 1 - Foundation & Reverse Engineering

## Goal
Establish the project structure and technical foundation for Mediarr, while gathering the reference source code from Sonarr, Radarr, Bazarr, and Prowlarr to facilitate reverse engineering.

## Scope
- Initialize a Next.js and Node.js monorepo.
- Clone the open-source reference projects into a dedicated `reference/` directory.
- Define a unified SQLite schema (Prisma/Drizzle) that supports multiple media types (Movies, Series) and indexer configurations.
- Set up the basic Docker Compose environment for local development.

## Technical Details
- **Architecture:** Monorepo using npm/pnpm workspaces.
- **Database:** SQLite with Prisma.
- **Reference Projects:** 
    - Sonarr (TV)
    - Radarr (Movies)
    - Bazarr (Subtitles)
    - Prowlarr (Indexers)

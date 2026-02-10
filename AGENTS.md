# Agent Instructions (AGENTS.md)

Welcome, Agent. This project uses the **Conductor Methodology** for development and project management. Adhere to the following rules during your session.

## 1. Context Awareness
Always start by reading the project index: `conductor/index.md`. This will guide you to the Product Definition, Tech Stack, and the current Tracks.

## 2. Track-Based Development
- **DO NOT** perform significant work without an active Track.
- Check `conductor/tracks.md` to see which tracks are `in_progress`.
- Follow the `plan.md` within the specific track folder (e.g., `conductor/tracks/<track_id>/plan.md`).

## 3. Workflow & Standards
- Adhere to the `conductor/workflow.md` for testing, committing, and reporting.
- Respect the code style guides located in `conductor/code_styleguides/`.
- Mediarr uses a **Monorepo** structure. Ensure you are working in the correct workspace (e.g., `app/` for frontend, `server/` for core logic).

## 4. Reverse Engineering Protocol
When implementing "arr" features, refer to the `reference/` directory (once initialized). Analyze the original implementations in Sonarr, Radarr, etc., to ensure feature parity while modernizing the architecture for Mediarr.

## 5. Persistence & State
Update the `plan.md` status markers `[ ]` as you complete tasks. If the workflow requires it, ensure you record task summaries using Git Notes or commit messages as specified.

## 6. Mandatory Archiving
Once a Track is marked as complete, **ALWAYS** archive it by moving its folder to `conductor/archive/` and removing its entry from the Tracks Registry. Do not ask for permission; this is the project standard.

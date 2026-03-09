# Agent Instructions (AGENTS.md)

Welcome, Agent. This project uses the **Conductor Methodology** for spec-driven development.

## Core Mandates
1. **Context First:** Always start by reading `conductor/index.md` to understand the product, tech stack, and workflow.
2. **Track-Based Work:** Never perform significant work without an active Track. Check `conductor/tracks.md` for `in_progress` tracks.
3. **Follow the Spec:** Each active track has a `spec.md` and `plan.md`. Read them. Implement strictly against the plan. Update the `[ ]` checkboxes in `plan.md` as you go.
4. **Monolith Architecture:** Mediarr is a single, unified monolith. Do not build siloed microservices or sync logic between domains (Movies vs. TV). They share the same database and memory space.
5. **No Next.js:** We use a pure React SPA (Vite) frontend communicating with a Bun/Node daemon. Do not attempt to use Next.js App Router features.
6. **Archiving:** When a plan is 100% complete, archive the track folder to `conductor/archive/` and update `tracks.md`. Do not ask for permission.
7. **Commit:** Commit work with a note after each phase of a track.
8. **Memory:** Use conductor/tech-debt.md and conductor/lessons-learned.md

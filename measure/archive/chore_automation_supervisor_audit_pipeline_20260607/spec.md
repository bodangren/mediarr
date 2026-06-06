# Spec: Automation Supervisor Audit Pipeline

## Overview

Expand the Measure automation supervisor with independent phase acceptance,
adversarial testing, conditional multimodal UI/UX auditing, final acceptance,
and mandatory Measure closeout roles.

## Requirements

1. Add configurable models, agents, and runners for all new roles.
2. Run phase acceptance after Green implementation.
3. Run adversarial testing after phase acceptance, including Playwright when applicable.
4. Run a Kimi WebBridge UI/UX audit only when frontend changes and a development URL make it applicable.
5. Run final acceptance after the final phase of a track.
6. Run a closeout steward after final acceptance to update the registry and archive the completed track.
7. Require structured evidence from audit roles and verify closeout mechanically.
8. Preserve dry-run support and expose the expanded role configuration in its output.

## Default Models

| Role | Default model |
|---|---|
| Phase Acceptance Auditor | `opencode-go/qwen3.7-plus` |
| Adversarial Test Auditor | `vocengine-coding/ark-code-latest` |
| UI/UX Auditor | `kimi-for-coding/k2p6` |
| Final Acceptance Auditor | `vocengine-coding/glm-5.1` |
| Measure Closeout Steward | `minimax-cn-coding-plan/MiniMax-M3` |

## Acceptance Criteria

- Every new role has an explicit prompt, retry loop, structured result contract, and mechanical gate.
- UX audit applicability supports `auto`, `always`, and `never`.
- Adversarial and UX audit artifacts are written under the run directory.
- Closeout fails unless the track is archived and removed from active tracks.
- Standard-library Python tests cover role defaults, UX applicability, and closeout gates.

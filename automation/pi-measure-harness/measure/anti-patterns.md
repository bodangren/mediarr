# Harness Anti-Patterns

This registry records framework-wide, falsifiable failure classes. Entries require a detection method, symptoms, remediation direction, and a regression guard.

## A1 — Prompt-only state transitions

**Symptoms:** A workflow advances because an agent claims completion despite missing, malformed, stale, or unauthorized evidence.

**Detection:** A regression test supplies each invalid result condition and asserts that the extension rejects the state transition.

**Remediation:** Put transition validation in the extension and canonical schemas, not in role prose alone.

**Guard:** Required by the controlled harness evolution track's state-machine test suite.

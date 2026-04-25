# Audit Execution Template

Use one block per executed check to keep parity findings reproducible.

## Execution Record
- `id`:
- `phase`:
- `timestamp_utc`:
- `operator`:
- `command`:
- `environment`:
- `observed_output_summary`:
- `evidence_paths`:
  -
- `finding_ids_impacted`:
  -
- `classification`: `verified` | `inferred`
- `notes`:

## Classification Rules
- `verified`: Command was executed and output captured in evidence artifacts.
- `inferred`: Derived from static inspection or indirect signals; must include rationale and confidence limits.

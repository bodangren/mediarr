# Plan — Nightly ASR CPU starvation

- [x] **P1.1** Bound whisper to `ASR_THREADS` (default 2) and nice the ASR child + batch runner.
- [x] **P1.2** Verify: compile, `--help`, `--dry-run`, and a measured ASR run showing bounded CPU with
      no long engine stall; ledger entry; remove the recurring "server unreachable" cause.
      Evidence: `subs-asr-english.py` now defaults to `ASR_THREADS` = half the cores (2 on this 4-core
      box), calls `os.nice(19)`, and passes `cpu_threads`; the batch runner nices itself and wraps its
      translator child in `nice -n 19 ionice -c 3`. Both scripts compile, `--help` lists `--threads`,
      `--dry-run` still lists skips. **Measured during a 5-minute ASR run** (small.en, threads=2,
      nice 19, 152 cues produced): `/api/health` answered **88/88 samples with HTTP 200, p50 16 ms,
      max 686 ms**, and the worst engine event-loop stall in that window was **559 ms** — against the
      **259,406 ms** stall that caused the 02:26 incident (460x smaller).

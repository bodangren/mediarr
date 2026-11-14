#!/usr/bin/env python3
"""Run the English -> Chinese bilingual pipeline over a directory, resumably.

For every video in --dir, in order:
  1. skip when `<stem>.zho.srt` already exists (the work is done);
  2. obtain the English source: an existing `.en.srt`, else ASR with
     `subs-asr-english.py` (faster-whisper) when the embedded track is bitmap or absent;
  3. translate to Simplified Chinese and write the stacked bilingual `<stem>.zho.srt`
     with `subs-translate-bilingual.py`.

This is the batch entry point for the operator's subtitle backlog (owner request 2026-11-14). It is
deliberately resumable: an interrupted overnight run continues where it stopped, and finished
episodes are never re-translated. The engine registers the sidecars on its own library scan and
`subtitle-sync` aligns them afterwards.

Usage (long runs detached and unbuffered):
  nohup python3 -u automation/scripts/subs-bilingual-batch.py \\
      --dir "/data/TV/Archer (2009)/Season 03" --batch 12 > /tmp/<label>.log 2>&1 &

Exit codes: 0 all attempted items done, 3 when at least one item failed.
"""
from __future__ import annotations

import argparse
import glob
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ASR = os.path.join(HERE, 'subs-asr-english.py')
TRANSLATE = os.path.join(HERE, 'subs-translate-bilingual.py')
ASR_PYTHON = os.path.expanduser('~/tools/subalign/.venv/bin/python')


def english_sidecar(video: str) -> str:
    return os.path.splitext(video)[0] + '.en.srt'


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dir', required=True)
    parser.add_argument('--pattern', default='*.mkv', help='glob inside --dir (default *.mkv)')
    parser.add_argument('--batch', type=int, default=12)
    parser.add_argument('--parallel', type=int, default=3, help='concurrent provider calls per episode')
    parser.add_argument('--asr-model', default=os.environ.get('ASR_MODEL', 'small.en'))
    parser.add_argument('--limit', type=int, default=0, help='stop after N items (0 = all)')
    parser.add_argument('--sleep', type=float, default=2.0, help='pause between items')
    args = parser.parse_args()

    videos = sorted(glob.glob(os.path.join(args.dir, args.pattern)))
    if not videos:
        print(f'error: no videos in {args.dir}/{args.pattern}', file=sys.stderr)
        return 2
    started = time.time()
    done = 0
    failures: list[str] = []
    for video in videos:
        stem = os.path.splitext(video)[0]
        target = stem + '.zho.srt'
        name = os.path.basename(video)
        if os.path.exists(target):
            print(f'SKIP (done): {name}')
            continue
        if args.limit and done + len(failures) >= args.limit:
            print(f'limit {args.limit} reached; stopping')
            break
        print(f'=== {name}')
        en = english_sidecar(video)
        if not os.path.exists(en):
            result = subprocess.run([ASR_PYTHON, ASR, '--video', video, '--out', en, '--model', args.asr_model])
            if result.returncode != 0 or not os.path.exists(en):
                print(f'FAILED (asr): {name}')
                failures.append(name)
                continue
        result = subprocess.run([
            sys.executable, '-u', TRANSLATE, '--batch', str(args.batch), '--parallel', str(args.parallel),
            '--video', video, '--en-srt', en,
        ])
        if result.returncode != 0 or not os.path.exists(target):
            print(f'FAILED (translate): {name}')
            failures.append(name)
            continue
        done += 1
        print(f'DONE: {name} ({done} this run, {int(time.time() - started)}s elapsed)')
        time.sleep(args.sleep)
    print(f'batch complete: {done} done, {len(failures)} failed' + (f' ({", ".join(failures)})' if failures else ''))
    return 0 if not failures else 3


if __name__ == '__main__':
    sys.exit(main())

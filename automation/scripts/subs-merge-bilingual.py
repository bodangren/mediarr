#!/usr/bin/env python3
"""Build bilingual (Chinese + English) `.zho.srt` sidecars from a Chinese-only season pack.

The operator case (found live 2026-11-14 on Archer S07): zimuku has a full-season pack in
Traditional Chinese only, while the video files carry an embedded English subtitle track. The house
style is a stacked line: Chinese first, English directly under it. This script does exactly that
deterministically:

  1. maps each pack SRT to its episode video by SxxEyy in the filename;
  2. extracts the embedded English track with ffmpeg (`-map 0:s:0`);
  3. converts Traditional -> Simplified with OpenCC (`t2s`);
  4. assigns every English cue to at most one Chinese cue (max time overlap, never duplicated);
  5. writes `<video-stem>.zho.srt` next to the video (existing sidecar is kept as `.orig.bak`).

The engine then registers the sidecar on its own library scan and `subtitle-sync` aligns it
(ffsubsync). Automation never calls the REST API; registering is the engine's job.

Usage:
  automation/scripts/subs-merge-bilingual.py --pack-dir /tmp/pack \\
      --video-dir "/data/TV/Archer (2009)/Season 07" [--dry-run] [--keep-temp]

Requires: ffmpeg/ffprobe, python3 with opencc-python-reimplemented (`python3 -c "import opencc"`).
Exit codes: 0 ok, 2 usage/verification error.
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import subprocess
import sys
import tempfile

try:
    from opencc import OpenCC
except ImportError:  # pragma: no cover - environment guard
    print('error: python opencc is required (pip install opencc-python-reimplemented)', file=sys.stderr)
    sys.exit(2)

TIME = re.compile(r'(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)')
EPISODE = re.compile(r'S(\d{2})E(\d{2})', re.IGNORECASE)
ASCII_WORD = re.compile(r'[A-Za-z]{2,}')


def ms(hours: str, minutes: str, seconds: str, fraction: str) -> int:
    return int(hours) * 3_600_000 + int(minutes) * 60_000 + int(seconds) * 1000 + int(fraction)


def parse_srt(path: str) -> list[tuple[int, int, list[str]]]:
    text = open(path, encoding='utf-8-sig', errors='replace').read().replace('\r\n', '\n')
    cues: list[tuple[int, int, list[str]]] = []
    for block in re.split(r'\n\s*\n', text.strip()):
        lines = [line for line in block.split('\n') if line.strip() != '']
        if not lines:
            continue
        times = None
        payload: list[str] = []
        for line in lines:
            match = TIME.search(line)
            if match:
                groups = match.groups()
                times = (ms(*groups[:4]), ms(*groups[4:]))
            elif not line.strip().isdigit():
                payload.append(line.strip())
        if times and payload:
            cues.append((times[0], times[1], payload))
    return cues


def format_ms(value: int) -> str:
    hours, rest = divmod(value, 3_600_000)
    minutes, rest = divmod(rest, 60_000)
    seconds, fraction = divmod(rest, 1000)
    return f'{hours:02d}:{minutes:02d}:{seconds:02d},{fraction:03d}'


def merge(zh: list[tuple[int, int, list[str]]], en: list[tuple[int, int, list[str]]]) -> list[tuple[int, int, list[str]]]:
    """One English cue per Chinese cue: the greatest time overlap wins, so nothing is duplicated."""
    assigned: dict[int, tuple[int, str]] = {}
    for en_start, en_end, en_lines in en:
        best_index, best_overlap = None, 0
        for index, (zh_start, zh_end, _) in enumerate(zh):
            overlap = min(en_end, zh_end) - max(en_start, zh_start)
            if overlap > best_overlap:
                best_index, best_overlap = index, overlap
        if best_index is None or best_overlap <= 0:
            continue
        text = re.sub(r'<[^>]+>', '', ' '.join(en_lines)).strip()
        if text and (best_index not in assigned or best_overlap > assigned[best_index][0]):
            assigned[best_index] = (best_overlap, text)
    out = []
    for index, (start, end, zh_lines) in enumerate(zh):
        english = assigned.get(index, (0, ''))[1]
        out.append((start, end, zh_lines + ([english] if english else [])))
    return out


def extract_embedded_english(video: str, target: str) -> bool:
    result = subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', video, '-map', '0:s:0', '-c:s', 'srt', target],
        capture_output=True, text=True,
    )
    return result.returncode == 0 and os.path.exists(target) and os.path.getsize(target) > 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--pack-dir', required=True, help='directory of Chinese SRT files named SxxEyy')
    parser.add_argument('--video-dir', required=True, help='directory holding the episode videos')
    parser.add_argument('--dry-run', action='store_true', help='report the plan without writing sidecars')
    parser.add_argument('--force', action='store_true',
                        help='merge even when the pack already looks bilingual (it would duplicate English lines)')
    parser.add_argument('--keep-temp', action='store_true', help='keep the extracted English SRTs')
    parser.add_argument(
        '--chinese-only',
        action='store_true',
        help='no embedded English available: convert Traditional->Simplified and place the Chinese-only '
             'sidecar (record it as chinese-only in the receipt; never invent English)',
    )
    args = parser.parse_args()

    videos = sorted(glob.glob(os.path.join(args.video_dir, '*.mkv')) + glob.glob(os.path.join(args.video_dir, '*.mp4')))
    if not videos:
        print(f'error: no videos in {args.video_dir}', file=sys.stderr)
        return 2
    by_episode: dict[tuple[int, int], str] = {}
    for video in videos:
        match = EPISODE.search(os.path.basename(video))
        if match:
            by_episode[(int(match.group(1)), int(match.group(2)))] = video

    converter = OpenCC('t2s')
    temp = tempfile.mkdtemp(prefix='subs-merge-')
    planned = 0
    for pack in sorted(glob.glob(os.path.join(args.pack_dir, '*.srt'))):
        match = EPISODE.search(os.path.basename(pack))
        if not match:
            print(f'skip (no SxxEyy): {os.path.basename(pack)}')
            continue
        key = (int(match.group(1)), int(match.group(2)))
        video = by_episode.get(key)
        if video is None:
            print(f'NO VIDEO for S{key[0]:02d}E{key[1]:02d}')
            continue
        zh = [(start, end, [converter.convert(line) for line in lines]) for start, end, lines in parse_srt(pack)]
        # A 简英 pack is already bilingual; merging the embedded English would duplicate every English
        # line (learned on Rick and Morty S08, 2026-11-15). Refuse unless the operator forces it.
        with_english = sum(1 for _, _, lines in zh if any(ASCII_WORD.search(line) for line in lines))
        if zh and with_english / len(zh) >= 0.5 and not args.force:
            print(f'REFUSING {os.path.basename(pack)}: already {with_english}/{len(zh)} cues carry English '
                  f'(bilingual pack) - merging would duplicate lines; pass --force to override')
            continue
        if args.chinese_only:
            merged = zh
        else:
            en_path = os.path.join(temp, f'en-S{key[0]:02d}E{key[1]:02d}.srt')
            if not extract_embedded_english(video, en_path):
                print(f'NO ENGLISH TRACK for {os.path.basename(video)}')
                continue
            merged = merge(zh, parse_srt(en_path))
        target = os.path.splitext(video)[0] + '.zho.srt'
        bilingual = sum(1 for _, _, lines in merged if len(lines) > 1)
        print(f'S{key[0]:02d}E{key[1]:02d}: cues={len(merged)} bilingual={bilingual} -> {os.path.basename(target)}')
        planned += 1
        if args.dry_run:
            continue
        if os.path.exists(target):
            os.replace(target, target + '.orig.bak')
        with open(target, 'w', encoding='utf-8') as handle:
            for index, (start, end, lines) in enumerate(merged, 1):
                handle.write(f'{index}\n{format_ms(start)} --> {format_ms(end)}\n' + '\n'.join(lines) + '\n\n')

    if not args.keep_temp:
        subprocess.run(['rm', '-rf', temp], check=False)
    else:
        print(f'temp kept: {temp}')
    print(f'{"planned" if args.dry_run else "written"}: {planned} sidecar(s)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

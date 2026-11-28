#!/usr/bin/env python3
"""Verify a season's Chinese subtitle sidecars against their videos (and optionally a pack).

Born from the 2026-11-28 TWD triple failure: S4, S6, S7 and four S5 episodes were filed with
Season 10 dialogue because ad-hoc import scripts shared one alignment workdir
(`WORK=/tmp/zmk_twd10/align`) and skipped ffsubsync when `E##.aligned.srt` already existed. Every
one of those receipts passed a count check ("MKV=16, ZHO=16, no sidecar under 50 cues"). A file
count, a parsable SRT and `ffprobe ok` are NOT content verification.

This script is the mechanical gate. Run it after placing sidecars and before writing a receipt.

Checks per video (from --season-dir):
  * sidecar exists (`<video-stem>.zho.srt`)
  * last cue ends before the video runtime (ffprobe, not container metadata guesswork)
  * enough CJK content (>= --min-cjk chars, default 400)
  * any title-card season label in the first cues matches the season folder
    (Chinese/English "Season N"/"第N季"); a label for another season is a hard fail
  * with --pack-dir: >= --min-overlap (default 0.98) of the sidecar's Chinese lines appear in
    that pack's matching E##.ass / E##.srt / SxxEyy.ass file - this is what catches a workdir leak

Usage:
  python3 automation/scripts/verify-zho-sidecars.py --season-dir "/data/TV/The Walking Dead/Season 7" \\
      --pack-dir /tmp/zmk_twd7/stage
Exit codes: 0 all checks pass, 1 at least one failure, 2 usage/argument error.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

VIDEO_EXT = {'.mkv', '.mp4', '.m4v', '.avi', '.mov', '.ts', '.wmv'}
CJK = re.compile(r'[\u4e00-\u9fff]')
OVERRIDE = re.compile(r'\{[^}]*\}')
CUE_TIME = re.compile(r'(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->')
CN_DIGIT = {c: i for i, c in enumerate('零一二三四五六七八九', 0)}
SEASON_LABEL_CN = re.compile(r'第([零一二三四五六七八九十]+)季')
SEASON_LABEL_EN = re.compile(r'\b[Ss]eason\s*(\d{1,2})\b')
EPISODE_IN_NAME = re.compile(r'[Ss](\d{1,2})[Ee](\d{1,3})')
EPISODE_IN_PACK = re.compile(r'(?:^|[/_.-])[Ee](\d{1,3})(?:[_.-]|$)', re.ASCII)


def cn_to_int(text: str) -> int | None:
    if not text:
        return None
    if text == '十':
        return 10
    if text.startswith('十'):
        return 10 + CN_DIGIT.get(text[1], 0)
    if '十' in text:
        tens, _, ones = text.partition('十')
        return CN_DIGIT.get(tens, 0) * 10 + (CN_DIGIT.get(ones, 0) if ones else 0)
    return CN_DIGIT.get(text)


def norm(line: str) -> str:
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', line))


def read_text(path: Path) -> str:
    raw = path.read_bytes()
    if raw[:2] in (b'\xff\xfe', b'\xfe\xff'):
        return raw.decode('utf-16', errors='replace')
    return raw.decode('utf-8-sig', errors='replace')


def srt_blocks(path: Path) -> list[list[str]]:
    text = read_text(path)
    blocks = []
    for block in re.split(r'\n\s*\n', text.strip()):
        lines = [l for l in block.splitlines() if l.strip()]
        if len(lines) >= 3 and '-->' in lines[1]:
            blocks.append(lines)
    return blocks


def last_cue_seconds(path: Path) -> float:
    times = CUE_TIME.findall(read_text(path))
    if not times:
        return 0.0
    h, m, s, ms = map(int, times[-1])
    return h * 3600 + m * 60 + s + ms / 1000


def probe_duration(video: Path) -> float:
    proc = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(video)],
        capture_output=True, text=True)
    try:
        return float(proc.stdout.strip())
    except ValueError:
        return 0.0


def pack_lines(pack_file: Path) -> set[str]:
    """Chinese lines of an ASS or SRT pack file, normalised."""
    text = read_text(pack_file)
    out: set[str] = set()
    if pack_file.suffix.lower() == '.ass':
        for line in text.splitlines():
            if not line.startswith('Dialogue:'):
                continue
            parts = line[len('Dialogue:'):].split(',', 9)
            if len(parts) < 10:
                continue
            body = OVERRIDE.sub('', parts[9]).replace(r'\N', '\n')
            for line_body in body.split('\n'):
                if CJK.search(line_body):
                    out.add(norm(line_body))
    else:
        for block in srt_blocks(pack_file):
            for line_body in block[2:]:
                if CJK.search(line_body):
                    out.add(norm(line_body))
    return out


def find_pack_file(pack_dir: Path, season: int | None, episode: int) -> Path | None:
    candidates = []
    for pattern in (f'E{episode:02d}.ass', f'E{episode:02d}.srt', f'e{episode:02d}.ass', f'e{episode:02d}.srt'):
        candidates.append(pack_dir / pattern)
    if season is not None:
        candidates.extend(pack_dir.glob(f'*[Ss]{season:02d}[Ee]{episode:02d}*.ass'))
        candidates.extend(pack_dir.glob(f'*[Ss]{season:02d}[Ee]{episode:02d}*.srt'))
    candidates.extend(pack_dir.glob(f'*E{episode:02d}*.ass'))
    candidates.extend(pack_dir.glob(f'*E{episode:02d}*.srt'))
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def check_one(video: Path, pack_dir: Path | None, season_hint: int | None,
              min_cjk: int, min_overlap: float) -> dict:
    result = {'video': video.name, 'problems': []}
    sidecar = video.with_suffix('.zho.srt')
    match = EPISODE_IN_NAME.search(video.name)
    season = int(match.group(1)) if match else season_hint
    episode = int(match.group(2)) if match else None
    result['season'], result['episode'] = season, episode
    if not sidecar.is_file():
        result['problems'].append('missing sidecar')
        return result
    blocks = srt_blocks(sidecar)
    if not blocks:
        result['problems'].append('sidecar has no parsable cues')
        return result
    zh_lines = [norm(l) for block in blocks for l in block[2:] if CJK.search(l)]
    cjk_chars = sum(len(CJK.findall(l)) for l in zh_lines)
    duration = probe_duration(video)
    last_cue = last_cue_seconds(sidecar)
    bilingual = sum(1 for block in blocks
                    if any(CJK.search(l) for l in block[2:])
                    and any(not CJK.search(l) for l in block[2:]))
    result.update({'cues': len(blocks), 'zh_lines': len(zh_lines), 'cjk_chars': cjk_chars,
                   'bilingual_blocks': bilingual, 'last_cue_s': round(last_cue, 1),
                   'duration_s': round(duration, 1)})
    if cjk_chars < min_cjk:
        result['problems'].append(f'too few CJK chars ({cjk_chars} < {min_cjk})')
    if duration and last_cue >= duration:
        result['problems'].append(f'last cue {last_cue:.0f}s is past the video end {duration:.0f}s')
    # title-card season label: only inspect the opening cues, where a pack's card lives
    for block in blocks[:8]:
        body = '\n'.join(block[2:])
        for label in SEASON_LABEL_CN.finditer(body):
            labelled = cn_to_int(label.group(1))
            if season is not None and labelled is not None and labelled != season:
                result['problems'].append(f"title card says {label.group(0)} but video is season {season}")
        for label in SEASON_LABEL_EN.finditer(body):
            if season is not None and int(label.group(1)) != season:
                result['problems'].append(f"title card says '{label.group(0)}' but video is season {season}")
    if pack_dir is not None:
        pack_file = find_pack_file(pack_dir, season, episode) if episode is not None else None
        if pack_file is None:
            result['problems'].append(f'no pack file for E{episode:02d} in {pack_dir}')
        else:
            reference = pack_lines(pack_file)
            overlap = (sum(1 for l in zh_lines if l in reference) / len(zh_lines)) if zh_lines else 0.0
            result['pack_file'] = pack_file.name
            result['pack_zh_lines'] = len(reference)
            result['token_overlap'] = round(overlap, 4)
            if overlap < min_overlap:
                result['problems'].append(
                    f'only {overlap:.1%} of Chinese lines appear in {pack_file.name} (min {min_overlap:.0%}) '
                    '- workdir leak or wrong pack?')
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--season-dir', required=True, type=Path)
    parser.add_argument('--pack-dir', type=Path, default=None)
    parser.add_argument('--season', type=int, default=None, help='season number when the filenames do not carry Sxx')
    parser.add_argument('--min-cjk', type=int, default=400)
    parser.add_argument('--min-overlap', type=float, default=0.98)
    parser.add_argument('--json', action='store_true', help='print one JSON result per video')
    args = parser.parse_args()
    if not args.season_dir.is_dir():
        print(f'not a directory: {args.season_dir}', file=sys.stderr)
        return 2
    if args.pack_dir is not None and not args.pack_dir.is_dir():
        print(f'not a directory: {args.pack_dir}', file=sys.stderr)
        return 2
    videos = sorted(p for p in args.season_dir.iterdir()
                    if p.is_file() and p.suffix.lower() in VIDEO_EXT)
    if not videos:
        print(f'no video files in {args.season_dir}', file=sys.stderr)
        return 2
    failures = 0
    for video in videos:
        result = check_one(video, args.pack_dir, args.season, args.min_cjk, args.min_overlap)
        ok = not result['problems']
        failures += 0 if ok else 1
        if args.json:
            print(json.dumps({'ok': ok, **result}, ensure_ascii=False))
        else:
            mark = 'OK ' if ok else 'FAIL'
            detail = (f"cues={result.get('cues')} cjk={result.get('cjk_chars')} "
                      f"last={result.get('last_cue_s')}/{result.get('duration_s')}s "
                      f"overlap={result.get('token_overlap', 'n/a')}")
            print(f'{mark} {video.name}  {detail}')
            for problem in result['problems']:
                print(f'     - {problem}')
    total = len(videos)
    print(f'\n{total - failures}/{total} sidecars verified'
          + (f', {failures} FAILED' if failures else ', all checks passed'))
    return 0 if failures == 0 else 1


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""Build bilingual (Simplified Chinese + English) `.zho.srt` sidecars by translating English subs.

The operator case (owner request 2026-11-14): "develop a method to translate available English subs
to Chinese and create the dual-language versions." Many library items carry an English subtitle
track but no Chinese and no Chinese pack exists. The house style is a stacked line: Chinese first,
English directly under it.

Pipeline (deterministic, no Mediarr REST API):
  1. take the English subtitle — an existing `.en.srt` or extract the embedded track with ffmpeg;
  2. translate cue-by-cue to Simplified Chinese with MiniMax (Anthropic-compatible endpoint,
     strict JSON-array contract, 3 retries per batch; the same model the engine's BilingualSubtitle
     Service uses: `MiniMax-M3.1-Flash`);
  3. write `<video-stem>.zho.srt` with the Chinese line then the English line(s); an existing
     sidecar is preserved as `.orig.bak`;
  4. the engine's library scan registers the external track and `subtitle-sync` aligns it.

Usage:
  MINIMAX_API_KEY in .env is used automatically when run from the repo.
  automation/scripts/subs-translate-bilingual.py --video "/data/TV/.../S03E01.mkv" [--dry-run]

  # a whole season
  automation/scripts/subs-translate-bilingual.py --dir "/data/TV/Archer (2009)/Season 03"

Exit codes: 0 ok, 2 usage/verification error, 3 translation failure (nothing half-written).
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

TIME = re.compile(r'(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)')
DEFAULT_ENDPOINT = 'https://api.minimaxi.com/anthropic/v1/messages'
XIAOMI_ENDPOINT = 'https://api.xiaomimimo.com/v1/chat/completions'
XIAOMI_MODEL = 'mimo-v2.6-flash'
DEFAULT_MODEL = 'MiniMax-M3.1-Flash'
PROMPT = (
    'Translate each English subtitle line into natural Simplified Chinese. '
    'Keep meaning, tone, and character names. Return ONLY a JSON array of strings in the same order '
    'as the input; no markdown, no commentary. If a line is only a bracketed sound effect, copy it '
    'unchanged.'
)


def load_api_keys() -> tuple[str, str]:
    keys = {'MINIMAX_API_KEY': '', 'XIAOMI_API_KEY': ''}
    for name in keys:
        keys[name] = os.environ.get(name, '').strip()
    env_path = os.path.join(os.getcwd(), '.env')
    if os.path.exists(env_path):
        for line in open(env_path, encoding='utf-8'):
            line = line.strip()
            for name in keys:
                if not keys[name] and line.startswith(name + '='):
                    keys[name] = line.split('=', 1)[1].strip().strip('"').strip("'")
    if not keys['MINIMAX_API_KEY'] and not keys['XIAOMI_API_KEY']:
        raise SystemExit('error: neither MINIMAX_API_KEY nor XIAOMI_API_KEY is set (env or repo .env)')
    return keys['MINIMAX_API_KEY'], keys['XIAOMI_API_KEY']


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
                start = int(groups[0]) * 3_600_000 + int(groups[1]) * 60_000 + int(groups[2]) * 1000 + int(groups[3])
                end = int(groups[4]) * 3_600_000 + int(groups[5]) * 60_000 + int(groups[6]) * 1000 + int(groups[7])
                times = (start, end)
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


def translate_batch(lines: list[str], api_key: str, model: str, endpoint: str) -> list[str]:
    body = json.dumps({
        'model': model,
        'max_tokens': 8192,
        'temperature': 0.2,
        'messages': [{'role': 'user', 'content': f'{PROMPT}\n\n{json.dumps(lines, ensure_ascii=False)}'}],
    }).encode('utf-8')
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(endpoint, data=body, headers={
                'content-type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01',
            })
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.load(response)
            text = ''.join(
                block.get('text', '') for block in payload.get('content', []) if block.get('type') == 'text'
            )
            cleaned = text.strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                match = re.search(r'\[[\s\S]*\]', cleaned)
                if not match:
                    raise ValueError('model returned no JSON array')
                parsed = json.loads(match.group(0))
            if not isinstance(parsed, list) or len(parsed) != len(lines):
                raise ValueError(f'expected {len(lines)} translations, got {len(parsed) if isinstance(parsed, list) else "non-array"}')
            return [str(item) for item in parsed]
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, TimeoutError) as error:
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'translation failed after 3 attempts: {last_error}')


def translate_xiaomi_batch(lines: list[str], api_key: str) -> list[str]:
    """OpenAI-compatible fallback (Xiaomi MiMo) with the same strict JSON-array contract."""
    body = json.dumps({
        'model': XIAOMI_MODEL,
        'max_tokens': 8192,
        'temperature': 0.2,
        'messages': [{'role': 'user', 'content': f'{PROMPT}\n\n{json.dumps(lines, ensure_ascii=False)}'}],
    }).encode('utf-8')
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            request = urllib.request.Request(XIAOMI_ENDPOINT, data=body, headers={
                'content-type': 'application/json',
                'authorization': f'Bearer {api_key}',
            })
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.load(response)
            text = (payload.get('choices') or [{}])[0].get('message', {}).get('content', '')
            cleaned = str(text).strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                match = re.search(r'\[[\s\S]*\]', cleaned)
                if not match:
                    raise ValueError('model returned no JSON array')
                parsed = json.loads(match.group(0))
            if not isinstance(parsed, list) or len(parsed) != len(lines):
                raise ValueError(f'expected {len(lines)} translations, got {len(parsed) if isinstance(parsed, list) else "non-array"}')
            return [str(item) for item in parsed]
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, TimeoutError) as error:
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'xiaomi translation failed: {last_error}')


def translate_safe(lines: list[str], api_key: str, model: str, endpoint: str, xiaomi_key: str = '') -> list[str]:
    """Translate a chunk: MiniMax -> Xiaomi fallback -> halving. One bad answer never sinks a file."""
    if api_key:
        try:
            return translate_batch(lines, api_key, model, endpoint)
        except RuntimeError as error:
            if not xiaomi_key:
                failure = str(error)
            else:
                print(f'  minimax failed ({error}); trying xiaomi for {len(lines)} line(s)')
                try:
                    return translate_xiaomi_batch(lines, xiaomi_key)
                except RuntimeError as xiaomi_error:
                    failure = f'minimax: {error}; xiaomi: {xiaomi_error}'
    elif xiaomi_key:
        try:
            return translate_xiaomi_batch(lines, xiaomi_key)
        except RuntimeError as error:
            failure = str(error)
    else:
        raise RuntimeError('no translation provider configured')
    if len(lines) <= 1:
        raise RuntimeError(f'cannot translate line: {failure}')
    midpoint = len(lines) // 2
    print(f'  halving a {len(lines)}-line chunk into {midpoint}+{len(lines) - midpoint}')
    return (
        translate_safe(lines[:midpoint], api_key, model, endpoint, xiaomi_key)
        + translate_safe(lines[midpoint:], api_key, model, endpoint, xiaomi_key)
    )


def extract_english(video: str, target: str) -> bool:
    result = subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', video, '-map', '0:s:0', '-c:s', 'srt', target],
        capture_output=True, text=True,
    )
    return result.returncode == 0 and os.path.exists(target) and os.path.getsize(target) > 0


def process(video: str, args, api_key: str, temp: str, xiaomi_key: str = '') -> int:
    stem = os.path.splitext(video)[0]
    en_path = args.en_srt or os.path.join(temp, os.path.basename(stem) + '.en.srt')
    if args.en_srt:
        pass
    elif args.from_audio or not extract_english(video, en_path):
        # Bitmap subtitle tracks (dvd_subtitle) cannot be converted to text by ffmpeg, and some
        # files carry no subtitle stream at all: generate the English source from the audio.
        print(f'ASR English source for {os.path.basename(video)} ({args.asr_model})')
        asr = subprocess.run([
            os.path.expanduser('~/tools/subalign/.venv/bin/python'),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), 'subs-asr-english.py'),
            '--video', video, '--out', en_path, '--model', args.asr_model,
        ])
        if asr.returncode != 0 or not os.path.exists(en_path):
            print(f'NO ENGLISH SOURCE: {os.path.basename(video)}')
            return 3
    cues = parse_srt(en_path)
    if not cues:
        print(f'NO CUES: {os.path.basename(en_path)}')
        return 3
    english_lines = [' '.join(lines) for _, _, lines in cues]
    print(f'{os.path.basename(video)}: {len(cues)} cues -> translating {len(english_lines)} lines')
    translated: list[str] = []
    for start in range(0, len(english_lines), args.batch):
        chunk = english_lines[start:start + args.batch]
        translated.extend(translate_safe(chunk, api_key, args.model, args.endpoint, xiaomi_key))
        print(f'  {min(start + args.batch, len(english_lines))}/{len(english_lines)}')
    target = stem + '.zho.srt'
    if args.dry_run:
        print(f'DRY RUN: would write {target} ({len(cues)} cues, sample: {translated[0]!r} / {english_lines[0]!r})')
        return 0
    if os.path.exists(target):
        os.replace(target, target + '.orig.bak')
    with open(target, 'w', encoding='utf-8') as handle:
        for index, (start, end, en_lines) in enumerate(cues, 1):
            zh = translated[index - 1]
            handle.write(f'{index}\n{format_ms(start)} --> {format_ms(end)}\n{zh}\n' + '\n'.join(en_lines) + '\n\n')
    print(f'WROTE {target}')
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument('--video', help='single video file')
    target.add_argument('--dir', help='video directory (all .mkv/.mp4)')
    parser.add_argument('--en-srt', help='use this English SRT instead of extracting the embedded track')
    parser.add_argument('--from-audio', action='store_true',
                        help='generate the English source with faster-whisper ASR (bitmap-subs or no-subs files)')
    parser.add_argument('--asr-model', default=os.environ.get('ASR_MODEL', 'small.en'))
    parser.add_argument('--model', default=os.environ.get('MINIMAX_MODEL', DEFAULT_MODEL))
    parser.add_argument('--endpoint', default=os.environ.get('MINIMAX_API_BASE', '').rstrip('/') + '/v1/messages'
                        if os.environ.get('MINIMAX_API_BASE') else DEFAULT_ENDPOINT)
    parser.add_argument('--batch', type=int, default=20)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    minimax_key, xiaomi_key = load_api_keys()
    api_key = minimax_key
    videos = [args.video] if args.video else sorted(
        glob.glob(os.path.join(args.dir, '*.mkv')) + glob.glob(os.path.join(args.dir, '*.mp4'))
    )
    if not videos:
        print('error: no video files', file=sys.stderr)
        return 2
    temp = tempfile.mkdtemp(prefix='subs-translate-')
    failures = 0
    for video in videos:
        try:
            if process(video, args, api_key, temp, xiaomi_key) != 0:
                failures += 1
        except RuntimeError as error:
            print(f'FAILED {os.path.basename(video)}: {error}', file=sys.stderr)
            failures += 1
    subprocess.run(['rm', '-rf', temp], check=False)
    print(f'done: {len(videos) - failures}/{len(videos)} translated')
    return 0 if failures == 0 else 3


if __name__ == '__main__':
    sys.exit(main())

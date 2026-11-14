#!/usr/bin/env python3
"""Fill untranslated cues in an existing bilingual sidecar.

`subs-translate-bilingual.py` deliberately keeps a cue English-only when a provider refuses or
rate-limits it, so an episode still ships instead of failing. This repair tool finds those English-only
blocks in an existing `<stem>.zho.srt` and translates just them, inserting the Chinese line above the
English one (the house stacking order). It never touches cues that already have Chinese.

Usage:
  python3 automation/scripts/subs-fill-missing.py --sidecar "/data/TV/.../Show S01E01.zho.srt"
  python3 automation/scripts/subs-fill-missing.py --sidecar <path> --dry-run   # list what it would fix
"""
from __future__ import annotations

import argparse
import importlib.util
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANSLATOR_PATH = os.path.join(HERE, 'subs-translate-bilingual.py')

CJK = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]')
TIMING = re.compile(r'^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$')
SFX = re.compile(r'^[\s♪♫\[\]\(\)\{\}\.\,\-\!\?\:\;\"\'a-z0-9\u2026]+$', re.IGNORECASE)


def is_sfx(lines: list[str]) -> bool:
    """True for cues that are only notes / bracketed sound descriptions, which stay English by design."""
    text = ' '.join(lines).strip()
    if not text:
        return True
    return bool(SFX.match(text))


def load_translator():
    spec = importlib.util.spec_from_file_location('subs_translate', TRANSLATOR_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def parse_blocks(text: str) -> list[dict]:
    blocks: list[dict] = []
    for raw in re.split(r'\n\s*\n', text.strip()):
        lines = raw.splitlines()
        if len(lines) < 3 or not TIMING.match(lines[1].strip()):
            continue
        blocks.append({'index': lines[0].strip(), 'timing': lines[1].strip(), 'lines': lines[2:]})
    return blocks


def has_cjk(lines: list[str]) -> bool:
    return any(CJK.search(line) for line in lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--sidecar', required=True, help='existing .zho.srt with possible English-only cues')
    parser.add_argument('--batch', type=int, default=20)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    if not os.path.exists(args.sidecar):
        print(f'error: {args.sidecar} not found', file=sys.stderr)
        return 2
    text = open(args.sidecar, encoding='utf-8-sig', errors='replace').read()
    blocks = parse_blocks(text)
    if not blocks:
        print('error: no subtitle blocks parsed', file=sys.stderr)
        return 2
    missing = [b for b in blocks if not has_cjk(b['lines']) and b['lines'] and not is_sfx(b['lines'])]
    print(f'{os.path.basename(args.sidecar)}: {len(blocks)} cues, {len(missing)} English-only')
    if not missing:
        print('nothing to repair')
        return 0
    if args.dry_run:
        for block in missing[:8]:
            print(f"  {block['timing']} | {' '.join(block['lines'])[:90]}")
        return 0

    translator = load_translator()
    minimax_key, xiaomi_key = translator.load_api_keys()
    english = [' '.join(b['lines']) for b in missing]
    translated: list[str] = []
    for start in range(0, len(english), args.batch):
        chunk = english[start:start + args.batch]
        try:
            translated.extend(translator.translate_safe(chunk, minimax_key, 'MiniMax-M3.1-Flash',
                                                        translator.DEFAULT_ENDPOINT, xiaomi_key))
        except RuntimeError as error:
            print(f'  chunk at {start} still refused: {error}')
            translated.extend([''] * len(chunk))

    fixed = 0
    for block, zh in zip(missing, translated):
        zh = (zh or '').strip()
        if zh and CJK.search(zh):
            block['lines'] = [zh] + block['lines']
            fixed += 1
    print(f'repaired {fixed}/{len(missing)} cues')

    backup = args.sidecar + '.orig.bak'
    if not os.path.exists(backup):
        shutil.copy2(args.sidecar, backup)
    with open(args.sidecar, 'w', encoding='utf-8') as handle:
        for block in blocks:
            handle.write(block['index'] + '\n' + block['timing'] + '\n' + '\n'.join(block['lines']) + '\n\n')
    print(f'WROTE {args.sidecar} (backup: {backup})')
    return 0 if fixed == len(missing) else 3


if __name__ == '__main__':
    sys.exit(main())

#!/home/daniel-bo/tools/subalign/.venv/bin/python
"""Transcribe a video's audio to an English SRT with faster-whisper.

Part of the English -> Chinese bilingual method (owner request 2026-11-14): when a file has no
*text* English subtitles (bitmap DVD subs cannot be converted by ffmpeg) or none at all, generate
the English source from the audio, then translate it to Chinese with
`automation/scripts/subs-translate-bilingual.py`.

Run with the subalign venv interpreter (shebang above) or:
  ~/tools/subalign/.venv/bin/python automation/scripts/subs-asr-english.py --video <file>

Exit codes: 0 ok, 2 usage/audio error.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile


def format_ts(seconds: float) -> str:
    millis = int(round(seconds * 1000))
    hours, rest = divmod(millis, 3_600_000)
    minutes, rest = divmod(rest, 60_000)
    secs, ms = divmod(rest, 1000)
    return f'{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}'


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--video', required=True)
    parser.add_argument('--out', help='output SRT (default: <video-stem>.en.srt next to the video)')
    parser.add_argument('--model', default=os.environ.get('ASR_MODEL', 'small.en'))
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--compute-type', default='int8')
    args = parser.parse_args()

    if not os.path.exists(args.video):
        print(f'error: missing video {args.video}', file=sys.stderr)
        return 2
    out = args.out or (os.path.splitext(args.video)[0] + '.en.srt')
    temp_dir = tempfile.mkdtemp(prefix='subs-asr-')
    wav = os.path.join(temp_dir, 'audio.wav')
    extract = subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', args.video, '-vn', '-ac', '1', '-ar', '16000', wav],
        capture_output=True, text=True,
    )
    if extract.returncode != 0:
        print(f'error: ffmpeg audio extraction failed: {extract.stderr[:300]}', file=sys.stderr)
        return 2

    from faster_whisper import WhisperModel

    print(f'{os.path.basename(args.video)}: transcribing with {args.model} ({args.device}/{args.compute_type})')
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, info = model.transcribe(wav, language='en', vad_filter=True, beam_size=1)
    lines = []
    count = 0
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue
        count += 1
        lines.append(f'{count}\n{format_ts(segment.start)} --> {format_ts(segment.end)}\n{text}\n')
    if not lines:
        print('error: no speech recognised', file=sys.stderr)
        return 2
    with open(out, 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(lines))
    print(f'WROTE {out} ({count} cues, duration {info.duration:.0f}s)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env node
/**
 * zimuku-acquire — deterministic Chinese-subtitle acquisition from zimuku.org (track
 * chore_migrate_hermes_automation_20261107, B2g).
 *
 * Why this exists: the flow (WAF captcha -> home-form search -> 双语 ASS/SRT pack -> signed
 * download href -> convert -> `<video>.zho.srt` -> server scan) was re-derived by hand on
 * 2026-11-11. Nobody should have to figure it out again.
 *
 * It drives the SAME Chrome the agent uses, through the kimi-webbridge CLI, so the site session
 * (PHPSESSID + `srcurl` cookie) is shared with the browser MCP tools. The captcha cannot be OCR'd
 * reliably, so the tool stops and hands the agent a PNG to read with its vision, then resumes with
 * `--solve <code>`:
 *
 *   node automation/scripts/zimuku-acquire.mjs resolve --query "银河护卫队3"
 *     -> {stage:"captcha", image:"/tmp/zimuku-captcha-<ts>.png"}   (exit 10)
 *   node automation/scripts/zimuku-acquire.mjs resolve --query "银河护卫队3" --solve 90658
 *     -> {stage:"results", results:[{id,title,format,bilingual,text}]}
 *   node automation/scripts/zimuku-acquire.mjs acquire --detail 220785 --video /data/Movies/.../x.mkv
 *     [--movie-id 558 | --series-id 123] [--dry-run] [--force]
 *     -> {stage:"done", placed, scan, receipt}
 *
 * Exit codes: 0 ok, 2 usage/verification error, 3 bridge unavailable, 10 captcha needed.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';

const BRIDGE = process.env.KIMI_WEBBRIDGE_BIN
  || '/home/daniel-bo/.nvm/versions/node/v24.18.0/bin/kimi-webbridge';
const API = process.env.MEDIARR_API || 'http://127.0.0.1:5174';
const RECEIPTS = process.env.SUBTITLE_ACQUIRE_RECEIPTS || '/config/subtitle-acquire-receipts.jsonl';
const STATE = join(os.tmpdir(), 'zimuku-acquire-state.json');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36';
const BILINGUAL_HINTS = ['简英', '中英', '双语', '简体&英文', '国英双字', '简体英文', '繁体英文', '简繁英'];
const REJECT_HINTS = ['SUP', 'IDX+SUB', 'IDX'];
const FORMAT_HINTS = ['ASS/SSA', 'ASS', 'SSA', 'SRT', 'SUP', 'IDX+SUB'];

function fail(message, code = 3) {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(code);
}

function bridge(action, payload = {}, timeoutMs = 60000) {
  const result = spawnSync(BRIDGE, [action, JSON.stringify({ action, ...payload })], {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  if (result.error) fail(`kimi-webbridge ${action}: ${result.error.message}`);
  const raw = (result.stdout || '').trim();
  if (!raw) fail(`kimi-webbridge ${action}: empty output (stderr: ${(result.stderr || '').slice(0, 200)})`);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail(`kimi-webbridge ${action}: non-JSON output: ${raw.slice(0, 200)}`);
  }
  if (parsed.success === false) fail(`kimi-webbridge ${action}: ${parsed.error || 'failed'}`);
  return parsed.data ?? parsed;
}

const evalJs = (code) => bridge('evaluate', { code })?.value;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function navigate(url) {
  bridge('navigate', { url });
  await sleep(1200);
}

function isWaf() {
  return evalJs(`document.title.includes('防火墙')`);
}

/** Save the captcha element as PNG (read_image cannot read the site's BMP) and stop. */
async function stopForCaptcha(stage, pending) {
  writeFileSync(STATE, JSON.stringify({ stage, pending, at: new Date().toISOString() }, null, 2));
  const src = evalJs(`(document.querySelector('.verifyimg') || {}).src || ''`);
  const base64 = String(src).replace(/^data:image\/[a-z+]+;base64,/, '');
  if (!base64) fail('captcha page without .verifyimg data');
  const bmpPath = join(os.tmpdir(), `zimuku-captcha-${Date.now()}.bmp`);
  const pngPath = bmpPath.replace(/\.bmp$/, '.png');
  writeFileSync(bmpPath, Buffer.from(base64, 'base64'));
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', bmpPath, pngPath], { encoding: 'utf8' });
  if (ff.status !== 0 || !existsSync(pngPath)) fail('could not convert captcha BMP to PNG (ffmpeg)');
  rmSync(bmpPath, { force: true });
  console.log(JSON.stringify({
    ok: true,
    stage: 'captcha',
    image: pngPath,
    hint: 'Read the 5 digits with your vision, then re-run the same command with --solve <code>.',
    pendingStage: stage,
  }));
  process.exit(10);
}

async function solveCaptcha(code) {
  bridge('fill', { selector: '#intext', value: String(code) });
  bridge('click', { selector: 'input[type="submit"]' });
  await sleep(1800);
  if (isWaf()) {
    rmSync(STATE, { force: true });
    fail('captcha rejected (still on the WAF page); re-run without --solve to get a fresh image', 2);
  }
  rmSync(STATE, { force: true });
}

async function openZimuku(solveCode) {
  await navigate('https://zimuku.org/');
  if (solveCode) await solveCaptcha(solveCode);
  if (isWaf()) await stopForCaptcha('open', { url: 'https://zimuku.org/' });
}

function parseResults() {
  const raw = evalJs(`(() => {
    const out = [];
    for (const anchor of document.querySelectorAll('a[href*="/detail/"]')) {
      const m = (anchor.getAttribute('href') || '').match(/\\/detail\\/(\\d+)\\.html/);
      if (!m) continue;
      const box = anchor.closest('tr, li, .item, .box') || anchor.parentElement;
      const text = ((box && box.innerText) || anchor.textContent || '').replace(/\\s+/g, ' ').trim();
      out.push({ id: m[1], title: (anchor.textContent || '').replace(/\\s+/g, ' ').trim(), text });
    }
    return out;
  })()`);
  const seen = new Set();
  return (raw || [])
    .filter((row) => row.id && !seen.has(row.id) && seen.add(row.id))
    .map((row) => {
      const format = FORMAT_HINTS.find((hint) => new RegExp(hint.replace(/[+]/g, '\\+')).test(row.text)) || '';
      const bilingual = BILINGUAL_HINTS.some((hint) => row.text.includes(hint));
      const rejected = REJECT_HINTS.some((hint) => row.text.includes(hint));
      return { id: row.id, title: row.title, format, bilingual, rejected, text: row.text.slice(0, 160) };
    });
}

async function resolve(query, solveCode, index) {
  await openZimuku(solveCode);
  bridge('fill', { selector: 'input[name="q"]', value: query });
  bridge('click', { selector: 'button.btn-search' });
  await sleep(1600);
  if (isWaf()) await stopForCaptcha('search', { query });
  const results = parseResults();
  if (!results.length) fail(`no results on zimuku for "${query}" (page may have changed)`, 2);
  const acceptable = results.filter((row) => row.bilingual && !row.rejected);
  const chosen = acceptable[Number(index) || 0] || null;
  console.log(JSON.stringify({ ok: true, stage: 'results', query, count: results.length, chosen, results }, null, 2));
}

function download(url, dest) {
  const result = spawnSync('curl', ['-sL', '--max-time', '120', '-A', UA, '-o', dest, url], { encoding: 'utf8' });
  if (result.status !== 0) fail(`curl failed: ${result.stderr?.slice(0, 200)}`);
  if (!existsSync(dest)) fail('download produced no file');
  const head = readFileSync(dest).subarray(0, 8);
  if (head.toString('latin1').startsWith('PK\u0003\u0004') || head.toString('latin1').startsWith('Rar!') || head.toString('latin1').startsWith('7z\u00bc\u00af')) {
    return 'archive';
  }
  return 'text';
}

function extractArchive(archivePath, workDir, args = {}) {
  mkdirSync(workDir, { recursive: true });
  if (readFileSync(archivePath).subarray(0, 2).toString('latin1') === 'PK') {
    const unzip = spawnSync('unzip', ['-o', '-q', archivePath, '-d', workDir], { encoding: 'utf8' });
    if (unzip.status !== 0) fail(`unzip failed: ${unzip.stderr?.slice(0, 200)}`);
  } else if (readFileSync(archivePath).subarray(0, 4).toString('latin1') === 'Rar!') {
    const unrar = spawnSync('unrar', ['x', '-o+', archivePath, workDir], { encoding: 'utf8' });
    if (unrar.status !== 0) fail(`unrar failed (install unrar-free?): ${unrar.stderr?.slice(0, 200)}`);
  } else {
    fail('7z packs are not supported by this tool; pick a different pack');
  }
  const files = spawnSync('find', [workDir, '-type', 'f'], { encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
  const subs = files.filter((file) => /\.(srt|ass|ssa)$/i.test(file));
  if (!subs.length) fail('archive contained no .srt/.ass/.ssa');
  if (args.file) {
    const picked = subs.filter((file) => file.includes(String(args.file)));
    if (picked.length === 1) return picked[0];
    fail(`--file "${args.file}" matched ${picked.length} files; candidates:\n${subs.join('\n')}`, 2);
  }
  if (args.episode) {
    const pattern = new RegExp(String(args.episode), 'i');
    const picked = subs.filter((file) => pattern.test(file));
    if (picked.length === 1) return picked[0];
    fail(`--episode "${args.episode}" matched ${picked.length} files; pass --file instead:\n${subs.join('\n')}`, 2);
  }
  if (subs.length > 1) {
    fail(`archive has ${subs.length} subtitle files; pass --episode S01E02 or --file <name> to choose one of:\n${subs.join('\n')}`, 2);
  }
  return subs[0];
}

function probeDuration(video) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' });
  const seconds = Number.parseFloat((result.stdout || '').trim());
  return Number.isFinite(seconds) ? seconds : null;
}

function lastCueSeconds(srtText) {
  const stamps = [...srtText.matchAll(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->/g)];
  if (!stamps.length) return null;
  const [, h, m, s, ms] = stamps[stamps.length - 1];
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
}

function looksAss(sourceFile) {
  const head = readFileSync(sourceFile).subarray(0, 8192).toString('utf8').replace(/^\uFEFF/, '');
  return /^\s*\[Script Info\]/i.test(head) || /\[V4\+? Styles\]/i.test(head);
}

function toCleanSrt(sourceFile, workDir) {
  const target = join(workDir, 'clean.srt');
  // Single-file packs are downloaded as `pack.bin`; sniff the content, never trust the extension.
  if (looksAss(sourceFile)) {
    const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', sourceFile, target], { encoding: 'utf8' });
    if (ff.status !== 0) fail(`ffmpeg ASS->SRT failed: ${ff.stderr?.slice(0, 300)}`);
  } else {
    const text = readFileSync(sourceFile, 'utf8');
    writeFileSync(target, text);
  }
  const cleaned = readFileSync(target, 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/<[^>]*>/g, '');
  writeFileSync(target, cleaned);
  return target;
}

function scanEndpointFor(args) {
  if (args['movie-id']) return `${API}/api/subtitles/movie/${args['movie-id']}/scan`;
  if (args['series-id']) return `${API}/api/subtitles/series/${args['series-id']}/scan`;
  if (args['scan-url']) return args['scan-url'];
  return null;
}

async function acquire(detailId, video, args) {
  if (!video || !existsSync(video)) fail(`video not found: ${video}`, 2);
  const solveCode = args.solve;
  await openZimuku(solveCode);

  await navigate(`https://zimuku.org/detail/${detailId}.html`);
  if (isWaf()) await stopForCaptcha('detail', { detailId, video, args });
  const detailTitle = String(evalJs('document.title') || '');
  const detailBody = String(evalJs('document.body.innerText.replace(/\\s+/g," ").slice(0,600)') || '');
  if (!/字幕/.test(detailBody)) fail(`detail ${detailId} did not render a subtitle page`);

  await navigate(`https://zimuku.org/dld/${detailId}.html`);
  if (isWaf()) await stopForCaptcha('dld', { detailId, video, args });
  const href = evalJs(`(() => {
    const links = [...document.querySelectorAll('a')];
    const preferred = links.find((a) => /联通高速下载/.test(a.textContent || ''));
    const any = links.find((a) => /\\/download\\//.test(a.getAttribute('href') || ''));
    return (preferred || any)?.href || null;
  })()`);
  if (!href) fail(`no download href on /dld/${detailId}.html`);

  const workDir = join(process.env.TMPDIR || os.tmpdir(), `zimuku-${detailId}-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });
  const pack = join(workDir, 'pack.bin');
  const kind = download(href, pack);
  const source = kind === 'archive' ? extractArchive(pack, workDir, args) : pack;
  const srt = toCleanSrt(source, workDir);
  const srtText = readFileSync(srt, 'utf8');
  const cues = (srtText.match(/^\d+\s*$/gm) || []).length;
  if (cues < 20) fail(`converted subtitle has only ${cues} cues — wrong or broken pack`, 2);

  const videoSeconds = probeDuration(video);
  const lastCue = lastCueSeconds(srtText);
  const delta = videoSeconds && lastCue ? Math.abs(videoSeconds - lastCue) : null;
  if (delta !== null && delta > 120 && !args.force) {
    fail(`subtitle ends ${Math.round(delta)}s away from the video runtime — verify with --force if intended`, 2);
  }

  const stem = video.replace(/\.[^.\\/]+$/, '');
  const placePath = `${stem}.zho.srt`;
  const result = {
    detailId,
    detailTitle: detailTitle.slice(0, 160),
    video,
    videoSeconds: videoSeconds ? Math.round(videoSeconds) : null,
    lastCueSeconds: lastCue ? Math.round(lastCue) : null,
    runtimeDeltaSeconds: delta === null ? null : Math.round(delta),
    cues,
    placePath,
    sizeBytes: Buffer.byteLength(srtText),
  };

  if (args['dry-run']) {
    console.log(JSON.stringify({ ok: true, stage: 'dry-run', ...result }, null, 2));
    return;
  }

  if (existsSync(placePath)) {
    const backup = `${placePath}.orig.bak`;
    if (!existsSync(backup)) renameSync(placePath, backup);
    result.backedUp = backup;
  }
  writeFileSync(placePath, srtText);
  result.placed = placePath;

  const scanUrl = scanEndpointFor(args);
  if (scanUrl) {
    const scan = spawnSync('curl', ['-s', '-X', 'POST', scanUrl], { encoding: 'utf8' });
    try {
      result.scan = JSON.parse(scan.stdout || '{}').data ?? JSON.parse(scan.stdout || '{}');
    } catch {
      result.scan = { raw: (scan.stdout || '').slice(0, 200) };
    }
  } else {
    result.scan = { skipped: 'no --movie-id/--series-id/--scan-url; run the server scan endpoint yourself' };
  }

  const receipt = {
    at: new Date().toISOString(),
    mediaType: args['movie-id'] ? 'MOVIE' : args['series-id'] ? 'SERIES' : 'UNKNOWN',
    mediaId: args['movie-id'] || args['series-id'] || null,
    ...result,
  };
  try {
    appendFileSync(RECEIPTS, `${JSON.stringify(receipt)}\n`);
    result.receipt = RECEIPTS;
  } catch (error) {
    result.receipt = `unwritable: ${error.message}`;
  }
  console.log(JSON.stringify({ ok: true, stage: 'done', ...result }, null, 2));
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return { command, args };
}

const { command, args } = parseArgs(process.argv.slice(2));

if (command === 'resolve') {
  if (!args.query) fail('usage: resolve --query <title> [--solve <code>] [--index N]', 2);
  await resolve(args.query, args.solve, args.index);
} else if (command === 'acquire') {
  if (!args.detail || !args.video) fail('usage: acquire --detail <id> --video <path> [--movie-id|--series-id] [--solve <code>] [--dry-run] [--force]', 2);
  await acquire(args.detail, args.video, args);
} else {
  fail('usage: zimuku-acquire.mjs <resolve|acquire> ... (see header comment)', 2);
}

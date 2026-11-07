/**
 * Manual/one-off bilingual completion for specific sidecars.
 * Usage: MINIMAX_API_KEY=... node_modules/.bin/tsx server/src/scripts/bilingualOnce.ts <srt> [...]
 */
import { BilingualSubtitleService } from '../services/BilingualSubtitleService';
import { MiniMaxTranslator } from '../services/MiniMaxTranslator';
import { XiaomiTranslator } from '../services/XiaomiTranslator';
import { FallbackTranslator } from '../services/FallbackTranslator';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('usage: bilingualOnce.ts <sidecar.zho.srt> [...]');
  process.exit(1);
}
const translators = [];
if (process.env.XIAOMI_API_KEY) translators.push(new XiaomiTranslator({ apiKey: process.env.XIAOMI_API_KEY }));
const minimaxKey = process.env.MINIMAX_API_KEY ?? process.env.MINIMAX_CN_API_KEY;
if (minimaxKey) translators.push(new MiniMaxTranslator({ apiKey: minimaxKey }));
if (translators.length === 0) {
  console.error('XIAOMI_API_KEY or MINIMAX_API_KEY is required');
  process.exit(1);
}
const service = new BilingualSubtitleService({
  statePath: process.env.BILINGUAL_STATE_PATH ?? '/tmp/bilingual-once-state.json',
  candidates: async () => paths,
  translator: new FallbackTranslator(translators),
});
service.runCycle({ limit: paths.length }).then(result => {
  console.log(JSON.stringify(result));
  process.exit(result.failed > 0 ? 1 : 0);
});

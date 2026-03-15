import type { ManualSearchCandidate, ManualSubtitleProvider } from '../SubtitleInventoryApiService';
import type { HttpClient } from '../../indexers/HttpClient';
import type { SettingsService } from '../SettingsService';
import { deriveReleaseName, extractExtension, readNumericProviderData } from './providerUtils';

interface AssrtSearchResponse {
  sub?: {
    subs?: Array<{
      id?: number;
      videoname?: string;
      native_name?: string | string[];
      lang?: {
        langlist?: Record<string, unknown>;
      };
    }>;
  };
}

interface AssrtDetailResponse {
  sub?: {
    subs?: Array<{
      filelist?: Array<{
        f?: string;
        url?: string;
      }>;
    }>;
  };
}

const SIMPLIFIED_KEYS = new Set(['简体', '簡體', 'chs', 'chn']);
const TRADITIONAL_KEYS = new Set(['繁体', '繁體', 'cht', 'twn']);
const ENGLISH_KEYS = new Set(['英文', 'eng']);

/**
 * ASSRT provider adapter for Chinese-focused subtitle search and download.
 */
export class AssrtProvider implements ManualSubtitleProvider {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly settingsService: SettingsService,
  ) {}

  async search(context: {
    variant: {
      id: number;
      path: string;
      releaseName?: string | null;
    };
    audioTracks: Array<{
      languageCode: string | null;
      isCommentary: boolean;
      isDefault: boolean;
    }>;
  }): Promise<ManualSearchCandidate[]> {
    const token = await this.resolveToken();
    const releaseName = context.variant.releaseName ?? deriveReleaseName(context.variant.path);
    if (!releaseName) {
      return [];
    }

    const url =
      `https://api.assrt.net/v1/sub/search?token=${encodeURIComponent(token)}`
      + `&q=${encodeURIComponent(releaseName)}&is_file=1`;

    const response = await this.httpClient.get(url);
    if (!response.ok) {
      throw new Error(`ASSRT search failed: ${response.status}`);
    }

    const payload = JSON.parse(response.body) as AssrtSearchResponse;
    const subtitles = payload.sub?.subs ?? [];

    const candidates: ManualSearchCandidate[] = [];
    for (const item of subtitles) {
      if (!item.id) {
        continue;
      }

      const languageCodes = this.extractLanguageCodes(item.lang?.langlist);
      if (languageCodes.length === 0) {
        continue;
      }

      const releaseNameCandidate = this.pickReleaseName(item);
      for (const languageCode of languageCodes) {
        candidates.push({
          languageCode,
          isForced: false,
          isHi: false,
          provider: 'assrt',
          score: languageCode === 'zh' ? 80 : 40,
          releaseName: releaseNameCandidate,
          extension: '.srt',
          providerData: {
            subtitleId: item.id,
          },
        });
      }
    }

    return candidates;
  }

  async download(candidate: ManualSearchCandidate): Promise<ManualSearchCandidate> {
    if (candidate.content && candidate.content.byteLength > 0) {
      return candidate;
    }

    const token = await this.resolveToken();
    const subtitleId = readNumericProviderData(candidate.providerData, 'subtitleId');
    if (!subtitleId) {
      throw new Error('ASSRT candidate is missing subtitle id');
    }

    const detailUrl =
      `https://api.assrt.net/v1/sub/detail?token=${encodeURIComponent(token)}`
      + `&id=${subtitleId}`;

    const detailResponse = await this.httpClient.get(detailUrl);
    if (!detailResponse.ok) {
      throw new Error(`ASSRT detail request failed: ${detailResponse.status}`);
    }

    const detailPayload = JSON.parse(detailResponse.body) as AssrtDetailResponse;
    const file = detailPayload.sub?.subs?.[0]?.filelist?.[0];
    if (!file?.url) {
      throw new Error('ASSRT detail response did not include a download URL');
    }

    const fileResponse = await fetch(file.url);
    if (!fileResponse.ok) {
      throw new Error(`ASSRT file download failed: ${fileResponse.status}`);
    }

    const content = Buffer.from(await fileResponse.arrayBuffer());
    return {
      ...candidate,
      content,
      extension: candidate.extension ?? extractExtension(file.f) ?? '.srt',
    };
  }

  private async resolveToken(): Promise<string> {
    const settings = await this.settingsService.get();
    const apiKeys = settings.apiKeys as unknown as Record<string, unknown>;
    const tokenFromSettings = typeof apiKeys.assrtApiToken === 'string' ? apiKeys.assrtApiToken : null;
    const token = tokenFromSettings ?? process.env.ASSRT_API_TOKEN ?? null;
    if (!token) {
      throw new Error('ASSRT API token is missing. Configure settings.apiKeys.assrtApiToken or ASSRT_API_TOKEN');
    }
    return token;
  }

  private extractLanguageCodes(langlist: Record<string, unknown> | undefined): string[] {
    if (!langlist) {
      return [];
    }

    const codes = new Set<string>();
    for (const key of Object.keys(langlist)) {
      const normalized = key.toLowerCase();
      if (SIMPLIFIED_KEYS.has(key) || TRADITIONAL_KEYS.has(key)) {
        codes.add('zh');
      } else if (ENGLISH_KEYS.has(key) || normalized === 'langeng') {
        codes.add('en');
      }

      if (normalized.includes('langchs') || normalized.includes('langchn') || normalized.includes('langcht')) {
        codes.add('zh');
      }
    }

    return [...codes];
  }

  private pickReleaseName(item: { videoname?: string; native_name?: string | string[] }): string | undefined {
    if (typeof item.videoname === 'string' && item.videoname.trim() !== '') {
      return item.videoname;
    }

    if (typeof item.native_name === 'string' && item.native_name.trim() !== '') {
      return item.native_name;
    }

    if (Array.isArray(item.native_name) && item.native_name.length > 0) {
      const first = item.native_name[0];
      if (typeof first === 'string' && first.trim() !== '') {
        return first;
      }
    }

    return undefined;
  }

}

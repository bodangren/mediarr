import type { ManualSearchCandidate, ManualSubtitleProvider } from '../SubtitleInventoryApiService';
import type { HttpClient } from '../../indexers/HttpClient';
import type { SettingsService } from '../SettingsService';

interface SubdlSearchItem {
  language?: string;
  hi?: boolean;
  comment?: string;
  url?: string;
  name?: string;
  releases?: string[];
}

interface SubdlSearchResponse {
  subtitles?: SubdlSearchItem[];
}

const LANGUAGE_CODE_MAP: Record<string, string> = {
  TH: 'th',
  ZH: 'zh',
  ZH_BG: 'zh',
  EN: 'en',
};

/**
 * SubDL provider adapter with Thai language support.
 */
export class SubdlProvider implements ManualSubtitleProvider {
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
    const apiKey = await this.resolveApiKey();
    const releaseName = context.variant.releaseName ?? this.deriveReleaseName(context.variant.path);
    if (!releaseName) {
      return [];
    }

    const searchUrl =
      `https://api.subdl.com/api/v1/subtitles?api_key=${encodeURIComponent(apiKey)}`
      + `&film_name=${encodeURIComponent(releaseName)}`
      + '&comment=1&releases=1&subs_per_page=30&type=movie';

    const response = await this.httpClient.get(searchUrl);
    if (!response.ok) {
      throw new Error(`SubDL search failed: ${response.status}`);
    }

    const payload = JSON.parse(response.body) as SubdlSearchResponse;
    const items = payload.subtitles ?? [];

    return items
      .map(item => {
        const languageCode = this.normalizeLanguage(item.language);
        if (!languageCode || !item.url) {
          return null;
        }

        const loweredComment = item.comment?.toLowerCase() ?? '';
        const isForced = loweredComment.includes('forced') || loweredComment.includes('foreign');
        const isHi = Boolean(item.hi) || loweredComment.includes('sdh') || loweredComment.includes(' hi ');

        return {
          languageCode,
          isForced,
          isHi,
          provider: 'subdl',
          score: languageCode === 'th' ? 80 : 35,
          releaseName: item.releases?.[0] ?? item.name,
          extension: '.srt',
          providerData: {
            downloadPath: item.url,
            fileName: item.name,
          },
        } satisfies ManualSearchCandidate;
      })
      .filter((candidate): candidate is ManualSearchCandidate => candidate !== null);
  }

  async download(candidate: ManualSearchCandidate): Promise<ManualSearchCandidate> {
    if (candidate.content && candidate.content.byteLength > 0) {
      return candidate;
    }

    const downloadPath = this.readStringProviderData(candidate.providerData, 'downloadPath');
    if (!downloadPath) {
      return candidate;
    }

    const normalizedPath = downloadPath.startsWith('http')
      ? downloadPath
      : `https://dl.subdl.com${downloadPath}`;

    const fileResponse = await fetch(normalizedPath);
    if (!fileResponse.ok) {
      throw new Error(`SubDL file download failed: ${fileResponse.status}`);
    }

    const content = Buffer.from(await fileResponse.arrayBuffer());
    const filename = this.readStringProviderData(candidate.providerData, 'fileName');

    return {
      ...candidate,
      content,
      extension: candidate.extension ?? this.extractExtension(filename) ?? '.srt',
    };
  }

  private async resolveApiKey(): Promise<string> {
    const settings = await this.settingsService.get();
    const apiKeys = settings.apiKeys as Record<string, unknown>;
    const keyFromSettings = typeof apiKeys.subdlApiKey === 'string' ? apiKeys.subdlApiKey : null;
    const apiKey = keyFromSettings ?? process.env.SUBDL_API_KEY ?? null;
    if (!apiKey) {
      throw new Error('SubDL API key is missing. Configure settings.apiKeys.subdlApiKey or SUBDL_API_KEY');
    }

    return apiKey;
  }

  private normalizeLanguage(language: string | undefined): string | null {
    if (!language) {
      return null;
    }

    const trimmed = language.trim().toUpperCase();
    if (LANGUAGE_CODE_MAP[trimmed]) {
      return LANGUAGE_CODE_MAP[trimmed];
    }

    if (/^[A-Z]{2}$/.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    return null;
  }

  private deriveReleaseName(filePath: string): string {
    const filename = filePath.split('/').pop() ?? filePath;
    return filename.replace(/\.[^.]+$/, '');
  }

  private extractExtension(filename?: string): string | undefined {
    if (!filename) {
      return undefined;
    }

    const match = filename.match(/\.[A-Za-z0-9]+$/);
    if (!match) {
      return undefined;
    }

    return match[0].toLowerCase();
  }

  private readStringProviderData(
    providerData: Record<string, unknown> | undefined,
    key: string,
  ): string | null {
    const value = providerData?.[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }

    return null;
  }
}

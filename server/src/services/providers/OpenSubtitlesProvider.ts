import type { ManualSearchCandidate, ManualSubtitleProvider } from '../SubtitleInventoryApiService';
import type { HttpClient } from '../../indexers/HttpClient';
import type { SettingsService } from '../SettingsService';
import { deriveReleaseName, extractExtension, readNumericProviderData } from './providerUtils';

interface OpenSubtitlesSearchResponse {
  data?: Array<{
    attributes?: {
      language?: string;
      foreign_parts_only?: boolean;
      hearing_impaired?: boolean;
      download_count?: number;
      votes?: number;
      release?: string;
      files?: Array<{
        file_id?: number;
        file_name?: string;
      }>;
    };
  }>;
}

interface OpenSubtitlesDownloadResponse {
  link?: string;
  file_name?: string;
}

export class OpenSubtitlesProvider implements ManualSubtitleProvider {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly settingsService: SettingsService
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
    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys.openSubtitlesApiKey;

    if (!apiKey) {
      throw new Error('OpenSubtitles API Key is missing. Please configure it in settings.');
    }

    const releaseName = context.variant.releaseName ?? deriveReleaseName(context.variant.path);
    if (!releaseName) {
      return [];
    }

    const url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(releaseName)}`;
    const response = await this.httpClient.get(url, {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`OpenSubtitles search failed: ${response.status}`);
    }

    const data = JSON.parse(response.body) as OpenSubtitlesSearchResponse;
    const records = data.data ?? [];

    return records
      .map(item => {
        const attributes = item.attributes;
        const file = attributes?.files?.[0];
        const fileId = file?.file_id;
        if (!attributes || !fileId) {
          return null;
        }

        const voteScore = typeof attributes.votes === 'number' ? attributes.votes : 0;
        const downloadScore = typeof attributes.download_count === 'number'
          ? Math.min(attributes.download_count / 50, 50)
          : 0;

        return {
          languageCode: attributes.language?.toLowerCase() ?? 'en',
          isForced: attributes.foreign_parts_only ?? false,
          isHi: attributes.hearing_impaired ?? false,
          provider: 'opensubtitles',
          score: voteScore + downloadScore,
          releaseName: attributes.release ?? file.file_name,
          extension: extractExtension(file.file_name) ?? '.srt',
          providerData: {
            fileId,
          },
        } satisfies ManualSearchCandidate;
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null) as ManualSearchCandidate[];
  }

  async download(candidate: ManualSearchCandidate): Promise<ManualSearchCandidate> {
    if (candidate.content && candidate.content.byteLength > 0) {
      return candidate;
    }

    const settings = await this.settingsService.get();
    const apiKey = settings.apiKeys.openSubtitlesApiKey;
    if (!apiKey) {
      throw new Error('OpenSubtitles API Key is missing. Please configure it in settings.');
    }

    const fileId = readNumericProviderData(candidate.providerData, 'fileId');
    if (!fileId) {
      throw new Error('OpenSubtitles candidate is missing provider file id');
    }

    const response = await this.httpClient.post(
      'https://api.opensubtitles.com/api/v1/download',
      {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_id: fileId }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenSubtitles download token request failed: ${response.status}`);
    }

    const payload = JSON.parse(response.body) as OpenSubtitlesDownloadResponse;
    if (!payload.link) {
      throw new Error('OpenSubtitles download response did not include a link');
    }

    const fileResponse = await fetch(payload.link);
    if (!fileResponse.ok) {
      throw new Error(`OpenSubtitles file download failed: ${fileResponse.status}`);
    }

    const content = Buffer.from(await fileResponse.arrayBuffer());
    return {
      ...candidate,
      content,
      extension: candidate.extension
        ?? extractExtension(payload.file_name)
        ?? '.srt',
    };
  }

}

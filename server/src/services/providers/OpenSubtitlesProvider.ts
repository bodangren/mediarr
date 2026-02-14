import type { ManualSearchCandidate, ManualSubtitleProvider } from '../SubtitleInventoryApiService';
import type { HttpClient } from '../../indexers/HttpClient';
import type { SettingsService } from '../SettingsService';

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

    const releaseName = context.variant.releaseName ?? '';
    if (!releaseName) {
        return [];
    }

    const url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(releaseName)}`;
    const response = await this.httpClient.get(url, {
        headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`OpenSubtitles search failed: ${response.status}`);
    }

    const data = JSON.parse(response.body);
    
    return (data.data || []).map((item: any) => ({
        languageCode: item.attributes?.language ?? 'en',
        isForced: item.attributes?.foreign_parts_only ?? false,
        isHi: item.attributes?.hearing_impaired ?? false,
        provider: 'OpenSubtitles',
        score: item.attributes?.votes ?? 0, 
        extension: '.srt'
    }));
  }

  async download(candidate: ManualSearchCandidate): Promise<ManualSearchCandidate> {
      // In a real implementation, this would fetch the download link and download the file content.
      // For now, we assume the candidate is ready or the download URL is handled elsewhere.
      // Or we implement a fetch.
      return candidate;
  }
}

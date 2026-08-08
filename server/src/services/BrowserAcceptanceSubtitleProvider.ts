import type {
  ManualSearchCandidate,
  ManualSubtitleProvider,
} from './SubtitleInventoryApiService';

const BROWSER_ACCEPTANCE_SUBTITLE_CONTENT = Buffer.from(
  '1\n00:00:00,000 --> 00:00:01,500\nBrowser acceptance Thai subtitle\n',
);

/**
 * Acceptance-only manual subtitle provider. It is selected exclusively by the
 * disposable browser daemon, so production provider credentials and networks
 * remain outside deterministic browser verification.
 */
export class BrowserAcceptanceSubtitleProvider implements ManualSubtitleProvider {
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
    if (!context.variant.path.includes('Browser Acceptance Movie')) {
      return [];
    }

    return [{
      languageCode: 'th',
      isForced: false,
      isHi: false,
      provider: 'browser-acceptance',
      score: 99,
      releaseName: context.variant.releaseName ?? 'Browser Acceptance Movie 2026',
      extension: '.srt',
    }];
  }

  async download(candidate: ManualSearchCandidate): Promise<ManualSearchCandidate> {
    return {
      ...candidate,
      content: BROWSER_ACCEPTANCE_SUBTITLE_CONTENT,
      extension: candidate.extension ?? '.srt',
    };
  }
}

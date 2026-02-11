import type {
  UpsertAudioTrackInput,
  UpsertSubtitleTrackInput,
} from '../repositories/SubtitleVariantRepository';

export interface ProbeTrackParsingResult {
  audioTracks: UpsertAudioTrackInput[];
  embeddedSubtitleTracks: UpsertSubtitleTrackInput[];
}

const COMMENTARY_PATTERN = /commentary/i;

const ALPHA3_TO_ALPHA2: Record<string, string> = {
  eng: 'en',
  spa: 'es',
  fre: 'fr',
  fra: 'fr',
  deu: 'de',
  ger: 'de',
  ita: 'it',
  jpn: 'ja',
  por: 'pt',
};

const normalizeLanguageCode = (code: unknown): string | undefined => {
  if (typeof code !== 'string') {
    return undefined;
  }

  const normalized = code.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length === 2) {
    return normalized;
  }

  if (normalized.length === 3) {
    return ALPHA3_TO_ALPHA2[normalized] ?? normalized;
  }

  return normalized.slice(0, 2);
};

const parseBooleanLike = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === '1' ||
      normalized === 'true' ||
      normalized === 'yes' ||
      normalized === 'y'
    );
  }

  return false;
};

/**
 * Normalizes probe metadata into variant audio/subtitle tracks.
 */
export class ProbeMetadataParser {
  parse(metadata: unknown): ProbeTrackParsingResult {
    if (!metadata || typeof metadata !== 'object') {
      return { audioTracks: [], embeddedSubtitleTracks: [] };
    }

    const ffprobeResult = this.parseFfprobe(metadata as Record<string, unknown>);
    if (
      ffprobeResult.audioTracks.length > 0 ||
      ffprobeResult.embeddedSubtitleTracks.length > 0
    ) {
      return ffprobeResult;
    }

    return this.parseMediainfo(metadata as Record<string, unknown>);
  }

  private parseFfprobe(metadata: Record<string, unknown>): ProbeTrackParsingResult {
    const streams = Array.isArray(metadata.streams) ? metadata.streams : [];
    const audioTracks: UpsertAudioTrackInput[] = [];
    const embeddedSubtitleTracks: UpsertSubtitleTrackInput[] = [];

    for (const stream of streams) {
      if (!stream || typeof stream !== 'object') {
        continue;
      }

      const data = stream as Record<string, any>;
      const codecType = data.codec_type;
      const tags = (data.tags ?? {}) as Record<string, any>;
      const disposition = (data.disposition ?? {}) as Record<string, any>;
      const title = tags.title ?? tags.handler_name;

      if (codecType === 'audio') {
        audioTracks.push({
          streamIndex: Number.isInteger(data.index) ? data.index : audioTracks.length,
          languageCode: normalizeLanguageCode(tags.language),
          codec: typeof data.codec_name === 'string' ? data.codec_name : undefined,
          channels:
            data.channels !== undefined ? String(data.channels) : undefined,
          isDefault: parseBooleanLike(disposition.default),
          isForced: parseBooleanLike(disposition.forced),
          isCommentary:
            parseBooleanLike(disposition.comment) ||
            (typeof title === 'string' && COMMENTARY_PATTERN.test(title)),
          name: typeof title === 'string' ? title : undefined,
        });
      }

      if (codecType === 'subtitle') {
        embeddedSubtitleTracks.push({
          source: 'EMBEDDED',
          streamIndex: Number.isInteger(data.index)
            ? data.index
            : embeddedSubtitleTracks.length,
          languageCode: normalizeLanguageCode(tags.language),
          isForced: parseBooleanLike(disposition.forced),
          isHi:
            parseBooleanLike(disposition.hearing_impaired) ||
            (typeof title === 'string' && /sdh|hearing/i.test(title)),
          codec: typeof data.codec_name === 'string' ? data.codec_name : undefined,
        });
      }
    }

    return { audioTracks, embeddedSubtitleTracks };
  }

  private parseMediainfo(
    metadata: Record<string, unknown>,
  ): ProbeTrackParsingResult {
    const tracks = Array.isArray(metadata.tracks) ? metadata.tracks : [];
    const audioTracks: UpsertAudioTrackInput[] = [];
    const embeddedSubtitleTracks: UpsertSubtitleTrackInput[] = [];

    for (const track of tracks) {
      if (!track || typeof track !== 'object') {
        continue;
      }
      const data = track as Record<string, any>;
      const type = String(data['@type'] ?? data.Type ?? '').toLowerCase();
      const title = data.Title ?? data.Title_More;
      const streamIdRaw = data.ID ?? data.StreamOrder;
      const streamIndex =
        Number.isFinite(Number(streamIdRaw))
          ? Number(streamIdRaw)
          : type === 'audio'
            ? audioTracks.length
            : embeddedSubtitleTracks.length;

      if (type === 'audio') {
        audioTracks.push({
          streamIndex,
          languageCode: normalizeLanguageCode(data.Language),
          codec:
            typeof data.Format === 'string'
              ? data.Format.toLowerCase()
              : undefined,
          channels: typeof data.Channels === 'string' ? data.Channels : undefined,
          isDefault: parseBooleanLike(data.Default),
          isForced: parseBooleanLike(data.Forced),
          isCommentary: typeof title === 'string' && COMMENTARY_PATTERN.test(title),
          name: typeof title === 'string' ? title : undefined,
        });
      }

      if (type === 'text' || type === 'subtitle') {
        embeddedSubtitleTracks.push({
          source: 'EMBEDDED',
          streamIndex,
          languageCode: normalizeLanguageCode(data.Language),
          isForced: parseBooleanLike(data.Forced),
          isHi:
            parseBooleanLike(data.HearingImpaired) ||
            (typeof title === 'string' && /sdh|hearing/i.test(title)),
          codec:
            typeof data.Format === 'string'
              ? data.Format.toLowerCase()
              : undefined,
        });
      }
    }

    return { audioTracks, embeddedSubtitleTracks };
  }
}

import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/track_selection.dart';

/// FR-6 — language matching and default-track selection are pure logic. We
/// exhaustively pin the matching contract here so the brief's `eng` / `zho`
/// / `chi` / `zh-Hans` / `chs` / `sc` rules don't drift over time.
void main() {
  group('isEnglishAudio', () {
    test('matches exact ISO 639-2 code', () {
      expect(isEnglishAudio('eng'), isTrue);
    });

    test('matches case-insensitively', () {
      expect(isEnglishAudio('ENG'), isTrue);
      expect(isEnglishAudio('Eng'), isTrue);
    });

    test('matches prefixed variants', () {
      expect(isEnglishAudio('eng-us'), isTrue);
      expect(isEnglishAudio('eng-GB'), isTrue);
      expect(isEnglishAudio('english'), isTrue);
    });

    test('rejects null and empty', () {
      expect(isEnglishAudio(null), isFalse);
      expect(isEnglishAudio(''), isFalse);
      expect(isEnglishAudio('  '), isFalse);
    });

    test('rejects other languages', () {
      expect(isEnglishAudio('jpn'), isFalse);
      expect(isEnglishAudio('zho'), isFalse);
      expect(isEnglishAudio('chi'), isFalse);
      expect(isEnglishAudio('spa'), isFalse);
      expect(isEnglishAudio('fre'), isFalse);
    });

    test('does NOT match partial letters', () {
      // "eng" prefix is allowed (eng-us, english), but bare "en" is not.
      expect(isEnglishAudio('en'), isFalse);
    });
  });

  group('isChineseSimplified', () {
    test('matches exact ISO 639-2/B zho', () {
      expect(isChineseSimplified('zho'), isTrue);
    });

    test('matches exact ISO 639-2/T chi', () {
      expect(isChineseSimplified('chi'), isTrue);
    });

    test('matches prefixed variants', () {
      expect(isChineseSimplified('zho-cn'), isTrue);
      expect(isChineseSimplified('chi-hans'), isTrue);
    });

    test('matches BCP-47 zh-Hans tag', () {
      expect(isChineseSimplified('zh-Hans'), isTrue);
      expect(isChineseSimplified('zh-hans'), isTrue);
      expect(isChineseSimplified('zh-CN'), isFalse);
    });

    test('matches Windows-style chs code', () {
      expect(isChineseSimplified('chs'), isTrue);
      // Mixed case + embedded subtag.
      expect(isChineseSimplified('en-CHS'), isTrue);
    });

    test('matches sc as a hyphen-separated subtag', () {
      expect(isChineseSimplified('zh-sc'), isTrue);
      expect(isChineseSimplified('zh-Hans-CN-SC'), isTrue);
    });

    test('rejects null and empty', () {
      expect(isChineseSimplified(null), isFalse);
      expect(isChineseSimplified(''), isFalse);
      expect(isChineseSimplified('  '), isFalse);
    });

    test('rejects Traditional Chinese variants', () {
      expect(isChineseSimplified('zh-Hant'), isFalse);
      expect(isChineseSimplified('cht'), isFalse);
      expect(isChineseSimplified('zht'), isFalse);
    });

    test('rejects other languages', () {
      expect(isChineseSimplified('eng'), isFalse);
      expect(isChineseSimplified('jpn'), isFalse);
      expect(isChineseSimplified('kor'), isFalse);
    });
  });

  group('selectDefaultAudioTrackIndex', () {
    test('picks English over Japanese', () {
      const audios = [
        AudioTrackInfo(id: 'a1', language: 'jpn', title: 'Japanese'),
        AudioTrackInfo(id: 'a2', language: 'eng', title: 'English'),
      ];
      expect(selectDefaultAudioTrackIndex(audios), 1);
    });

    test('picks first English when multiple variants exist', () {
      const audios = [
        AudioTrackInfo(id: 'a1', language: 'jpn', title: 'Japanese'),
        AudioTrackInfo(id: 'a2', language: 'eng-us', title: 'English (US)'),
        AudioTrackInfo(id: 'a3', language: 'eng-gb', title: 'English (UK)'),
      ];
      expect(selectDefaultAudioTrackIndex(audios), 1);
    });

    test('falls back to first audio when no English', () {
      const audios = [
        AudioTrackInfo(id: 'a1', language: 'jpn', title: 'Japanese'),
        AudioTrackInfo(id: 'a2', language: 'spa', title: 'Spanish'),
      ];
      expect(selectDefaultAudioTrackIndex(audios), 0);
    });

    test('falls back to first when language is null', () {
      const audios = [
        AudioTrackInfo(id: 'a1', title: 'Unknown 1'),
        AudioTrackInfo(id: 'a2', language: 'jpn', title: 'Japanese'),
      ];
      expect(selectDefaultAudioTrackIndex(audios), 0);
    });

    test('returns null when list is empty', () {
      expect(selectDefaultAudioTrackIndex(const []), isNull);
    });
  });

  group('selectDefaultSubtitleTrackIndex', () {
    test('picks Chinese Simplified when present', () {
      const subs = [
        SubtitleTrackInfo(id: 's1', language: 'eng', title: 'English'),
        SubtitleTrackInfo(id: 's2', language: 'zho', title: 'Chinese'),
      ];
      expect(selectDefaultSubtitleTrackIndex(subs), 1);
    });

    test('picks zh-Hans when both zho and zh-Hans present', () {
      const subs = [
        SubtitleTrackInfo(id: 's1', language: 'eng', title: 'English'),
        SubtitleTrackInfo(id: 's2', language: 'zho', title: 'Chinese'),
        SubtitleTrackInfo(id: 's3', language: 'zh-Hans', title: 'Simplified'),
      ];
      expect(selectDefaultSubtitleTrackIndex(subs), 1);
    });

    test('returns null when no Chinese Simplified', () {
      const subs = [
        SubtitleTrackInfo(id: 's1', language: 'eng', title: 'English'),
        SubtitleTrackInfo(id: 's2', language: 'jpn', title: 'Japanese'),
      ];
      expect(selectDefaultSubtitleTrackIndex(subs), isNull);
    });

    test('returns null when subtitle list is empty', () {
      expect(selectDefaultSubtitleTrackIndex(const []), isNull);
    });

    test('does NOT silently fall back to English subs', () {
      // FR-6: if no Chinese sub, do NOT fall back to another subtitle
      // language silently. The state must report no subtitle selected.
      const subs = [
        SubtitleTrackInfo(id: 's1', language: 'eng', title: 'English'),
      ];
      expect(selectDefaultSubtitleTrackIndex(subs), isNull);
    });

    test('matches prefixed zh-Hans-CN', () {
      const subs = [
        SubtitleTrackInfo(id: 's1', language: 'zh-Hans-CN', title: 'Simplified PRC'),
      ];
      expect(selectDefaultSubtitleTrackIndex(subs), 0);
    });
  });

  group('external subtitle tracks', () {
    test('uses stable manifest IDs and removes loaded duplicates', () {
      const containerTracks = [
        SubtitleTrackInfo(id: '1', language: 'eng', title: 'English'),
        SubtitleTrackInfo(
          id: '7',
          language: 'zho',
          title: 'Chinese (Simplified)',
        ),
      ];
      const externalTrack = SubtitleTrackInfo(
        id: 'external:101',
        language: 'zho',
        title: 'Chinese (Simplified)',
      );

      expect(externalSubtitleTrackId(101), 'external:101');
      expect(
        mergeSubtitleTracks(containerTracks, const [externalTrack]),
        [containerTracks.first, externalTrack],
      );
    });
  });
}

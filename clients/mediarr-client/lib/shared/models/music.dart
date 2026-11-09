/// Music domain models (track feature_music_library_20261107). Kept separate from Movie/Episode so
/// music state never leaks into Continue Watching.
class MusicArtist {
  const MusicArtist({required this.id, required this.name, this.albumCount = 0, this.trackCount = 0});

  final int id;
  final String name;
  final int albumCount;
  final int trackCount;

  factory MusicArtist.fromJson(Map<String, dynamic> json) => MusicArtist(
        id: json['id'] as int,
        name: json['name'] as String? ?? 'Unknown Artist',
        albumCount: (json['albumCount'] as num?)?.toInt() ?? 0,
        trackCount: (json['trackCount'] as num?)?.toInt() ?? 0,
      );
}

class MusicAlbum {
  const MusicAlbum({
    required this.id,
    required this.artistId,
    required this.title,
    this.year,
    this.trackCount = 0,
    this.artworkUrl,
  });

  final int id;
  final int artistId;
  final String title;
  final int? year;
  final int trackCount;
  final String? artworkUrl;

  factory MusicAlbum.fromJson(Map<String, dynamic> json) => MusicAlbum(
        id: json['id'] as int,
        artistId: (json['artistId'] as num?)?.toInt() ?? 0,
        title: json['title'] as String? ?? 'Unknown Album',
        year: (json['year'] as num?)?.toInt(),
        trackCount: (json['trackCount'] as num?)?.toInt() ?? 0,
        artworkUrl: json['artworkUrl'] as String?,
      );
}

class MusicTrack {
  const MusicTrack({
    required this.id,
    required this.title,
    required this.albumId,
    required this.artistId,
    this.trackNumber,
    this.discNumber,
    this.durationSeconds,
    this.isPlayed = false,
    this.playCount = 0,
    this.artistName,
    this.albumTitle,
    this.albumArtworkUrl,
    this.lastPlayedAt,
  });

  final int id;
  final String title;
  final int albumId;
  final int artistId;
  final int? trackNumber;
  final int? discNumber;
  final int? durationSeconds;
  final bool isPlayed;
  final int playCount;
  final String? artistName;
  final String? albumTitle;
  final String? albumArtworkUrl;
  final DateTime? lastPlayedAt;

  String get durationLabel {
    final total = durationSeconds ?? 0;
    if (total <= 0) return '';
    final minutes = total ~/ 60;
    final seconds = (total % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  factory MusicTrack.fromJson(Map<String, dynamic> json) => MusicTrack(
        id: json['id'] as int,
        title: json['title'] as String? ?? 'Unknown Track',
        albumId: (json['albumId'] as num?)?.toInt() ?? 0,
        artistId: (json['artistId'] as num?)?.toInt() ?? 0,
        trackNumber: (json['trackNumber'] as num?)?.toInt(),
        discNumber: (json['discNumber'] as num?)?.toInt(),
        durationSeconds: (json['durationSeconds'] as num?)?.toInt(),
        isPlayed: json['isPlayed'] as bool? ?? false,
        playCount: (json['playCount'] as num?)?.toInt() ?? 0,
        artistName: json['artistName'] as String?,
        albumTitle: json['albumTitle'] as String?,
        albumArtworkUrl: json['albumArtworkUrl'] as String?,
        lastPlayedAt: DateTime.tryParse(json['lastPlayedAt'] as String? ?? ''),
      );
}

/// One page of the track library/search endpoint (`total` lets the TV paginate Play all).
class MusicTrackPage {
  const MusicTrackPage({required this.items, required this.total, required this.offset});

  final List<MusicTrack> items;
  final int total;
  final int offset;

  factory MusicTrackPage.fromJson(Map<String, dynamic> json) => MusicTrackPage(
        items: (json['items'] as List<dynamic>? ?? const [])
            .map((item) => MusicTrack.fromJson(item as Map<String, dynamic>))
            .toList(),
        total: (json['total'] as num?)?.toInt() ?? 0,
        offset: (json['offset'] as num?)?.toInt() ?? 0,
      );
}

/// Album plus its ordered tracks (the TV album view consumes this directly).
class MusicAlbumDetail {
  const MusicAlbumDetail({required this.album, required this.tracks});

  final MusicAlbum album;
  final List<MusicTrack> tracks;

  factory MusicAlbumDetail.fromJson(Map<String, dynamic> json) => MusicAlbumDetail(
        album: MusicAlbum.fromJson(json),
        tracks: (json['tracks'] as List<dynamic>? ?? const [])
            .map((track) => MusicTrack.fromJson(track as Map<String, dynamic>))
            .toList(),
      );
}

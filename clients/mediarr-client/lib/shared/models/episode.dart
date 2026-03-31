/// Episode data model matching the server API response.
class Episode {
  const Episode({
    required this.id,
    required this.seasonNumber,
    required this.episodeNumber,
    this.title,
    this.overview,
    this.airDateUtc,
    this.hasFile = false,
    this.monitored = false,
    this.isDownloading = false,
    this.quality,
    this.path,
    this.playbackState,
  });

  final int id;
  final int seasonNumber;
  final int episodeNumber;
  final String? title;
  final String? overview;
  final String? airDateUtc;
  final bool hasFile;
  final bool monitored;
  final bool isDownloading;
  final String? quality;
  final String? path;
  final EpisodePlaybackState? playbackState;

  factory Episode.fromJson(Map<String, dynamic> json) {
    return Episode(
      id: json['id'] as int,
      seasonNumber: json['seasonNumber'] as int,
      episodeNumber: json['episodeNumber'] as int,
      title: json['title'] as String?,
      overview: json['overview'] as String?,
      airDateUtc: json['airDateUtc'] as String?,
      hasFile: json['hasFile'] as bool? ?? false,
      monitored: json['monitored'] as bool? ?? false,
      isDownloading: json['isDownloading'] as bool? ?? false,
      quality: json['quality'] as String?,
      path: json['path'] as String?,
      playbackState: json['playbackState'] != null
          ? EpisodePlaybackState.fromJson(
              json['playbackState'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Playback state from server API (renamed to avoid collision with
/// PlaybackState in playback_service.dart).
class EpisodePlaybackState {
  const EpisodePlaybackState({
    this.position = 0,
    this.duration = 0,
    this.isWatched = false,
  });

  final int position;
  final int duration;
  final bool isWatched;

  double get progress =>
      duration > 0 ? position / duration : 0.0;

  factory EpisodePlaybackState.fromJson(Map<String, dynamic> json) {
    return EpisodePlaybackState(
      position: json['position'] as int? ?? 0,
      duration: json['duration'] as int? ?? 0,
      isWatched: json['isWatched'] as bool? ?? false,
    );
  }
}

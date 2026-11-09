/// One downloaded YouTube video (track feature_youtube_library_20261107).
///
/// Its own model, not a Movie/Episode: the library has its own retention and playback state and must
/// never appear in movie/TV Continue Watching.
class YoutubeVideo {
  const YoutubeVideo({
    required this.id,
    required this.videoId,
    required this.title,
    required this.streamUrl,
    required this.thumbUrl,
    this.channel,
    this.durationSeconds,
    this.isWatched = false,
    this.position = 0,
  });

  final int id;
  final String videoId;
  final String title;
  final String streamUrl;
  final String thumbUrl;
  final String? channel;
  final int? durationSeconds;
  final bool isWatched;
  final int position;

  String get channelName {
    final value = channel?.trim();
    return value == null || value.isEmpty ? 'Uncategorized' : value;
  }

  String get durationLabel {
    final total = durationSeconds ?? 0;
    if (total <= 0) return '';
    final minutes = total ~/ 60;
    final seconds = (total % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  factory YoutubeVideo.fromJson(Map<String, dynamic> json) {
    return YoutubeVideo(
      id: json['id'] as int,
      videoId: json['videoId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      streamUrl: json['streamUrl'] as String? ?? '',
      thumbUrl: json['thumbUrl'] as String? ?? '',
      channel: json['channel'] as String?,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt(),
      isWatched: json['isWatched'] as bool? ?? false,
      position: (json['position'] as num?)?.toInt() ?? 0,
    );
  }
}

/// YouTube download queue health (`/api/youtube/queue`), shown alongside the library so the owner can
/// see why new videos are not appearing without opening the SPA.
class YoutubeQueueSummary {
  const YoutubeQueueSummary({
    required this.available,
    required this.pending,
    required this.downloading,
    required this.failed,
    required this.retrying,
    required this.exhausted,
    required this.quarantined,
    required this.total,
  });

  factory YoutubeQueueSummary.fromJson(Map<String, dynamic> json) {
    int asInt(String key) => (json[key] as num?)?.toInt() ?? 0;
    return YoutubeQueueSummary(
      available: asInt('available'),
      pending: asInt('pending'),
      downloading: asInt('downloading'),
      failed: asInt('failed'),
      retrying: asInt('retrying'),
      exhausted: asInt('exhausted'),
      quarantined: asInt('quarantined'),
      total: asInt('total'),
    );
  }

  final int available;
  final int pending;
  final int downloading;
  final int failed;
  final int retrying;
  final int exhausted;
  final int quarantined;
  final int total;

  String get summaryLine {
    final parts = <String>[
      '$available available',
      if (pending > 0) '$pending pending',
      if (downloading > 0) '$downloading downloading',
      if (retrying > 0) '$retrying retrying',
      if (exhausted > 0) '$exhausted exhausted',
      if (quarantined > 0) '$quarantined quarantined',
    ];
    return parts.join(' · ');
  }
}

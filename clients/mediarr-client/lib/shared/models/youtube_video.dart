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

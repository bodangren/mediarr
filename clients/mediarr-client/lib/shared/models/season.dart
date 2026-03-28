/// Season data model.
class Season {
  const Season({
    required this.id,
    required this.seasonNumber,
    this.monitored = false,
    this.episodeCount,
    this.episodeFileCount,
    this.sizeOnDisk,
  });

  final int id;
  final int seasonNumber;
  final bool monitored;
  final int? episodeCount;
  final int? episodeFileCount;
  final int? sizeOnDisk;

  factory Season.fromJson(Map<String, dynamic> json) {
    return Season(
      id: json['id'] as int,
      seasonNumber: json['seasonNumber'] as int,
      monitored: json['monitored'] as bool? ?? false,
      episodeCount: json['episodeCount'] as int?,
      episodeFileCount: json['episodeFileCount'] as int?,
      sizeOnDisk: json['sizeOnDisk'] as int?,
    );
  }
}

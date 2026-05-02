/// Unified model for library grid items (movies or series).
class LibraryItem {
  const LibraryItem({
    required this.id,
    required this.title,
    required this.type,
    this.year,
    this.posterUrl,
    this.status,
    this.monitored = false,
  });

  final int id;
  final String title;
  final String type;
  final int? year;
  final String? posterUrl;
  final String? status;
  final bool monitored;

  factory LibraryItem.fromJson(Map<String, dynamic> json) {
    return LibraryItem(
      id: json['id'] as int,
      title: json['title'] as String,
      type: json['type'] as String,
      year: json['year'] as int?,
      posterUrl: json['posterUrl'] as String?,
      status: json['status'] as String?,
      monitored: json['monitored'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'type': type,
      'year': year,
      'posterUrl': posterUrl,
      'status': status,
      'monitored': monitored,
    };
  }
}

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/models/movie.dart';
import '../../shared/models/subtitle_models.dart';
import '../../shared/services/api_client.dart';
import '../playback/playback_screen.dart';
import 'subtitle_search_sheet.dart';

/// Movie detail view showing metadata, file info, and status.
class MovieDetailScreen extends ConsumerStatefulWidget {
  const MovieDetailScreen({super.key, required this.movie});

  final Movie movie;

  @override
  ConsumerState<MovieDetailScreen> createState() => _MovieDetailScreenState();
}

class _MovieDetailScreenState extends ConsumerState<MovieDetailScreen> {
  List<VariantInventory> _subtitles = const [];
  bool _loadingSubtitles = false;

  @override
  void initState() {
    super.initState();
    _loadSubtitles();
  }

  Future<void> _loadSubtitles() async {
    if (!widget.movie.hasFile) return;
    setState(() => _loadingSubtitles = true);
    try {
      final client = ref.read(apiClientProvider.notifier);
      final subtitles = await client.getMovieSubtitles(widget.movie.id);
      if (mounted) {
        setState(() {
          _subtitles = subtitles;
          _loadingSubtitles = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingSubtitles = false);
    }
  }

  void _showSubtitleSearch() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SubtitleSearchSheet(
        movieId: widget.movie.id,
        onDownloaded: _loadSubtitles,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final movie = widget.movie;
    return Scaffold(
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Poster
          SizedBox(
            width: 300,
            child: movie.posterUrl != null
                ? CachedNetworkImage(
                    imageUrl: movie.posterUrl!,
                    fit: BoxFit.cover,
                    height: double.infinity,
                  )
                : Container(
                    color: MediarrColors.surfaceHover,
                    child: const Center(
                      child: Icon(Icons.movie, size: 80, color: MediarrColors.textMuted),
                    ),
                  ),
          ),
          // Details
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Back button and title
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back),
                        onPressed: () => Navigator.of(context).pop(),
                        autofocus: true,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          movie.title,
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Year and status row
                  Row(
                    children: [
                      if (movie.year != null)
                        _MetadataChip(label: '${movie.year}'),
                      if (movie.runtime != null) ...[
                        const SizedBox(width: 8),
                        _MetadataChip(label: '${movie.runtime} min'),
                      ],
                      if (movie.quality != null) ...[
                        const SizedBox(width: 8),
                        _MetadataChip(
                          label: movie.quality!,
                          color: MediarrColors.accentPrimary,
                        ),
                      ],
                      const SizedBox(width: 8),
                      _StatusChip(
                        hasFile: movie.hasFile,
                        monitored: movie.monitored,
                      ),
                    ],
                  ),
                  // Play button
                  if (movie.hasFile) ...[
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.play_arrow, size: 28),
                      label: const Text('Play'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: MediarrColors.accentPrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 14,
                        ),
                        textStyle: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      onPressed: () {
                        final apiClient = ref.read(apiClientProvider.notifier);
                        final streamUrl =
                            apiClient.getStreamUrl(movie.id, 'movie');
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => PlaybackScreen(
                              streamUrl: streamUrl,
                              title: movie.title,
                              mediaId: movie.id,
                              mediaType: 'movie',
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                  const SizedBox(height: 24),
                  // Overview
                  if (movie.overview != null) ...[
                    Text(
                      'Overview',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      movie.overview!,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                  ],
                  // File info
                  if (movie.hasFile) ...[
                    Text(
                      'File Info',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    if (movie.path != null)
                      _InfoRow(label: 'Path', value: movie.path!),
                    if (movie.sizeOnDisk != null)
                      _InfoRow(
                        label: 'Size',
                        value: _formatSize(movie.sizeOnDisk!),
                      ),
                  ],
                  // Subtitles
                  if (movie.hasFile) ...[
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Text(
                          'Subtitles',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const Spacer(),
                        TextButton.icon(
                          onPressed: _showSubtitleSearch,
                          icon: const Icon(Icons.search, size: 18),
                          label: const Text('Search'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_loadingSubtitles)
                      const SizedBox(
                        height: 40,
                        child: Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: MediarrColors.accentPrimary,
                          ),
                        ),
                      )
                    else if (_subtitles.isEmpty)
                      const Text(
                        'No subtitle data available',
                        style: TextStyle(color: MediarrColors.textMuted),
                      )
                    else
                      ..._subtitles.expand((variant) => [
                        if (variant.subtitleTracks.isNotEmpty)
                          ...variant.subtitleTracks.map((track) => Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.subtitles,
                                  size: 16,
                                  color: MediarrColors.textSecondary,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    track.displayLabel,
                                    style: const TextStyle(
                                      color: MediarrColors.textPrimary,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                                _MetadataChip(
                                  label: track.source,
                                  color: MediarrColors.textMuted,
                                ),
                              ],
                            ),
                          ))
                        else
                          const Text(
                            'No subtitle tracks',
                            style: TextStyle(color: MediarrColors.textMuted),
                          ),
                      ]),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatSize(int bytes) {
    if (bytes >= 1073741824) {
      return '${(bytes / 1073741824).toStringAsFixed(1)} GB';
    } else if (bytes >= 1048576) {
      return '${(bytes / 1048576).toStringAsFixed(0)} MB';
    }
    return '$bytes B';
  }
}

class _MetadataChip extends StatelessWidget {
  const _MetadataChip({required this.label, this.color});
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: (color ?? MediarrColors.textMuted).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: (color ?? MediarrColors.textMuted).withValues(alpha: 0.3),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color ?? MediarrColors.textSecondary,
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.hasFile, required this.monitored});
  final bool hasFile;
  final bool monitored;

  @override
  Widget build(BuildContext context) {
    final (label, color) = hasFile
        ? ('Downloaded', MediarrColors.statusSuccess)
        : monitored
            ? ('Missing', MediarrColors.statusWarning)
            : ('Unmonitored', MediarrColors.textMuted);

    return _MetadataChip(label: label, color: color);
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                color: MediarrColors.textMuted,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: MediarrColors.textPrimary,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

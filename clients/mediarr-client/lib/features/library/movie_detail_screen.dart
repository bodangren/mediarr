import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/movie.dart';
import '../../shared/models/subtitle_models.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/media_detail/action_bar.dart';
import '../../shared/widgets/media_detail/file_info_card.dart';
import '../../shared/widgets/media_detail/media_hero.dart';
import '../../shared/widgets/media_detail/metadata_section.dart';
import '../playback/playback_navigation.dart';
import 'subtitle_search_sheet.dart';

class MovieDetailScreen extends ConsumerStatefulWidget {
  const MovieDetailScreen({super.key, required this.movie});

  final Movie movie;

  @override
  ConsumerState<MovieDetailScreen> createState() => _MovieDetailScreenState();
}

class _MovieDetailScreenState extends ConsumerState<MovieDetailScreen> {
  List<VariantInventory> _subtitles = const [];
  bool _loadingSubtitles = false;
  bool _subtitleError = false;

  @override
  void initState() {
    super.initState();
    _loadSubtitles();
  }

  Future<void> _loadSubtitles() async {
    if (!widget.movie.effectiveHasFile) return;
    setState(() {
      _loadingSubtitles = true;
      _subtitleError = false;
    });
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
      if (mounted) {
        setState(() {
          _loadingSubtitles = false;
          _subtitleError = true;
        });
      }
    }
  }

  Future<void> _delete() async {
    final client = ref.read(apiClientProvider.notifier);
    try {
      await client.deleteMovie(widget.movie.id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete ${widget.movie.title}: $e')),
        );
      }
      return;
    }
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  void _play() {
    final movie = widget.movie;
    final apiClient = ref.read(apiClientProvider.notifier);
    final streamUrl = apiClient.getStreamUrl(movie.id, 'movie');
    openFullscreenPlayback(
      context,
      streamUrl: streamUrl,
      title: movie.title,
      mediaId: movie.id,
      mediaType: 'movie',
    );
  }

  void _searchUpgrades() {
    final movie = widget.movie;
    final client = ref.read(apiClientProvider.notifier);
    client.searchReleases(
      query: movie.title,
      type: 'movie',
      year: movie.year,
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Searching for upgrades...')),
    );
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

    final actions = <ActionBarAction>[
      if (movie.effectiveHasFile)
        ActionBarAction(
          label: 'Play',
          icon: Icons.play_arrow,
          isPrimary: true,
          onPressed: _play,
        ),
      ActionBarAction(
        label: 'Search Upgrades',
        icon: Icons.upgrade,
        onPressed: _searchUpgrades,
      ),
      ActionBarAction(
        label: 'Delete',
        icon: Icons.delete,
        isDestructive: true,
        onPressed: _delete,
      ),
    ];

    return NetflixScaffold(
      child: Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        body: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 0, 0),
                child: FocusableAction(
                  autofocus: true,
                  variant: FocusableActionVariant.button,
                  onSelect: () => Navigator.of(context).pop(),
                  borderRadius: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 12),
                    color: MediarrColors.surfaceCard,
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.arrow_back,
                            size: 28, color: MediarrColors.textPrimary),
                        SizedBox(width: 8),
                        Text(
                          'Back',
                          style: TextStyle(
                            color: MediarrColors.textPrimary,
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              MediaHero(
                backdropUrl: movie.backdropUrl,
                posterUrl: movie.posterUrl,
                title: movie.title,
                subtitle: movie.year?.toString(),
              ),
              MetadataSection(
                synopsis: movie.overview,
                runtime: movie.runtime,
              ),
              if (movie.effectiveHasFile)
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  child: FileInfoCard(
                    quality: movie.quality,
                    path: movie.path,
                    sizeBytes: movie.sizeOnDisk,
                  ),
                ),
              if (movie.effectiveHasFile) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      Text(
                        'Subtitles',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const Spacer(),
                      FocusableAction(
                        variant: FocusableActionVariant.button,
                        onSelect: _showSubtitleSearch,
                        borderRadius: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.search,
                                  size: 24, color: MediarrColors.textPrimary),
                              SizedBox(width: 8),
                              Text(
                                'Search',
                                style: TextStyle(
                                  color: MediarrColors.textPrimary,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _buildSubtitleArea(),
                ),
              ],
              ActionBar(actions: actions),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSubtitleArea() {
    if (_loadingSubtitles) {
      return const SizedBox(
        height: 40,
        child: Center(
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: MediarrColors.accentPrimary,
          ),
        ),
      );
    }
    if (_subtitleError) {
      return const Text(
        'Error loading subtitles',
        style: TextStyle(color: MediarrColors.statusError),
      );
    }
    if (_subtitles.isEmpty) {
      return const Text(
        'No subtitle data available',
        style: TextStyle(color: MediarrColors.textMuted),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final variant in _subtitles)
          if (variant.subtitleTracks.isNotEmpty)
            for (final track in variant.subtitleTracks)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    const Icon(
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
                  ],
                ),
              )
          else
            const Text(
              'No subtitle tracks',
              style: TextStyle(color: MediarrColors.textMuted),
            ),
      ],
    );
  }
}

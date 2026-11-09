import 'dart:async';

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
  PlaybackManifestResume? _resume;

  @override
  void initState() {
    super.initState();
    _loadSubtitles();
    _loadResume();
  }

  /// The movie's own playback position, so the action bar can say "Watched" or
  /// "38% · 5:00" instead of offering Play with no indication anything happened.
  Future<void> _loadResume() async {
    if (!widget.movie.effectiveHasFile) return;
    try {
      final manifest = await ref.read(apiClientProvider.notifier).getPlaybackManifest(
            mediaId: widget.movie.id,
            type: 'movie',
          );
      if (mounted) setState(() => _resume = manifest?.resume);
    } catch (_) {
      // A failed resume lookup must never block the detail screen.
    }
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
    // Confirmation is owned by the shared ActionBar (_confirmDestructive), so this
    // handler must only perform the delete when it is called.
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

  Future<void> _play({bool fromStart = false}) async {
    final movie = widget.movie;
    final apiClient = ref.read(apiClientProvider.notifier);
    final streamUrl = apiClient.getStreamUrl(movie.id, 'movie');
    await openFullscreenPlayback(
      context,
      streamUrl: streamUrl,
      title: movie.title,
      mediaId: movie.id,
      mediaType: 'movie',
      resumeFrom: Duration(seconds: fromStart ? 0 : (_resume?.position ?? 0)),
    );
    // Playback writes progress as it runs; refresh the chip so Resume is honest
    // when the viewer comes back (Kimi movies review).
    if (mounted) unawaited(_loadResume());
  }

  Future<void> _setWatched(bool watched) async {
    final movie = widget.movie;
    try {
      await ref.read(apiClientProvider.notifier).setWatched(
            mediaType: 'movie',
            mediaId: movie.id,
            watched: watched,
          );
      if (!mounted) return;
      setState(() {
        _resume = PlaybackManifestResume(
          userId: 'lan-default',
          position: watched ? 0 : (_resume?.position ?? 0),
          duration: _resume?.duration ?? 0,
          progress: watched ? 1 : 0,
          isWatched: watched,
          lastWatched: DateTime.now(),
        );
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(watched ? 'Marked as watched' : 'Marked as unwatched')),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update watched state: $e')),
        );
      }
    }
  }

  void _searchUpgrades() {
    final movie = widget.movie;
    final client = ref.read(apiClientProvider.notifier);
    client.searchReleases(
      query: movie.title,
      type: MediarrApiClient.searchTypeMovie,
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
          label: _resume != null && !_resume!.isWatched && _resume!.position > 10
              ? 'Resume · ${(_resume!.progress.clamp(0, 1) * 100).round()}%'
              : 'Play',
          icon: Icons.play_arrow,
          isPrimary: true,
          onPressed: _play,
        ),
      if (movie.effectiveHasFile &&
          _resume != null &&
          !_resume!.isWatched &&
          _resume!.position > 10)
        ActionBarAction(
          label: 'Start over',
          icon: Icons.replay,
          onPressed: () => _play(fromStart: true),
        ),
      ActionBarAction(
        label: _resume?.isWatched == true ? 'Mark Unwatched' : 'Mark Watched',
        icon: _resume?.isWatched == true ? Icons.remove_done : Icons.check,
        onPressed: () => _setWatched(_resume?.isWatched != true),
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
              if (_resume != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      key: const Key('movie-watch-chip'),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _resume!.isWatched
                            ? const Color(0x3322C55E)
                            : const Color(0x338B5CF6),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _resume!.isWatched
                            ? '✓ Watched'
                            : '▶ ${(_resume!.progress.clamp(0, 1) * 100).round()}% · ${_formatPosition(_resume!.position)}',
                        style: TextStyle(
                          color: _resume!.isWatched
                              ? const Color(0xFF86EFAC)
                              : const Color(0xFFC4B5FD),
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
              // Play belongs on the first screen: the old layout put it below
              // the synopsis, file card and subtitle list, so a viewer had to
              // arrow past everything to start the film (device capture
              // 2026-11-08 — same defect the series detail had).
              ActionBar(actions: actions),
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
            ],
          ),
        ),
      ),
    );
  }

  static String _formatPosition(int seconds) {
    final minutes = seconds ~/ 60;
    final remainder = seconds % 60;
    final hours = minutes ~/ 60;
    if (hours > 0) {
      return '$hours:${(minutes % 60).toString().padLeft(2, '0')}:${remainder.toString().padLeft(2, '0')}';
    }
    return '$minutes:${remainder.toString().padLeft(2, '0')}';
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
    // Flatten across variants: a movie with two file variants used to print
    // one "No subtitle tracks" line per variant (two identical lines on the
    // device, 2026-11-08).
    final seen = <String>{};
    final tracks = _subtitles
        .expand((variant) => variant.subtitleTracks)
        // The same physical track appears once per file variant (duplicate
        // releases), so dedupe by what the viewer actually sees.
        .where((track) => seen.add(
              '${track.languageCode}|${track.isForced}|${track.isHi}',
            ))
        .toList(growable: false);
    if (tracks.isEmpty) {
      return const Text(
        'No subtitle data available',
        style: TextStyle(color: MediarrColors.textMuted),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final track in tracks)
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
          ),
      ],
    );
  }
}

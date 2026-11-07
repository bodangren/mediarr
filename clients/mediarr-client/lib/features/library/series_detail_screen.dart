import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/episode.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/media_detail/action_bar.dart';
import '../../shared/widgets/media_detail/episode_list.dart';
import '../../shared/widgets/media_detail/file_info_card.dart';
import '../../shared/widgets/media_detail/media_hero.dart';
import '../../shared/widgets/media_detail/metadata_section.dart';
import '../playback/playback_navigation.dart';
import '../playback/playback_queue.dart';

class SeriesDetailScreen extends ConsumerStatefulWidget {
  const SeriesDetailScreen({super.key, required this.series});

  final Series series;

  @override
  ConsumerState<SeriesDetailScreen> createState() => _SeriesDetailScreenState();
}

class _SeriesDetailScreenState extends ConsumerState<SeriesDetailScreen> {
  Series? _detail;
  bool _loading = true;
  String? _error;
  final Map<int, int> _episodeSeasonMap = {};

  /// FR-2: the first action-bar button. [EpisodeList] hands focus here when Down
  /// leaves the last episode, so the walk never lands on `Delete Series`.
  final FocusNode _firstActionFocusNode = FocusNode(
    debugLabel: 'SeriesDetail.actionBar.first',
  );

  /// FR-2: handle on the episode list, so Down from the page header enters the
  /// list instead of jumping to the rail.
  final GlobalKey<EpisodeListState> _episodeListKey =
      GlobalKey<EpisodeListState>();

  /// Whether the Back control currently holds focus.
  bool _backFocused = false;

  /// Whether the primary Resume/Play CTA currently holds focus.
  bool _ctaFocused = false;

  @override
  void dispose() {
    _firstActionFocusNode.dispose();
    super.dispose();
  }

  /// FR-2: Down from the header enters the episode list.
  ///
  /// Left to itself Flutter resolves that press geometrically and picks the
  /// rail, because the rail sits nearer to the header button than the season
  /// chips do. Measured: Down from `Back` landed on `Home` in the rail.
  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    if (event.logicalKey != LogicalKeyboardKey.arrowDown) {
      return KeyEventResult.ignored;
    }
    if (!_backFocused && !_ctaFocused) return KeyEventResult.ignored;
    final list = _episodeListKey.currentState;
    if (list == null) return KeyEventResult.ignored;
    return list.focusFirstChip()
        ? KeyEventResult.handled
        : KeyEventResult.ignored;
  }

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final client = ref.read(apiClientProvider.notifier);
      final detail = await client.getSeriesDetail(widget.series.id);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  /// The episode the primary action should play (Kimi UX review 2026-11-07:
  /// a focused Resume/Play must be above the fold on entry).
  ///
  /// Preference order: an in-progress episode (position > 30 s, not watched),
  /// then the first playable episode of the current season, then the first
  /// playable episode anywhere. Null means nothing is downloaded.
  EpisodeListItem? _resumeTarget(Series series) {
    EpisodeListItem? firstPlayable;
    EpisodeListItem? inProgress;
    var bestPosition = 0;
    for (final season in series.seasons) {
      for (final episode in season.episodes) {
        if (!episode.effectiveHasFile) continue;
        firstPlayable ??= _toListItem(episode);
        final state = episode.playbackState;
        if (state != null && !state.isWatched && state.position > 30) {
          if (state.position > bestPosition) {
            bestPosition = state.position;
            inProgress = _toListItem(episode);
            _episodeSeasonMap[episode.id] = season.seasonNumber;
          }
        }
      }
    }
    return inProgress ?? firstPlayable;
  }

  EpisodeListItem _toListItem(Episode episode) {
    _episodeSeasonMap[episode.id] = episode.seasonNumber;
    return EpisodeListItem(
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      airDateUtc: episode.airDateUtc,
      hasFile: episode.effectiveHasFile,
      quality: episode.quality,
      progress: episode.playbackState?.progress ?? 0,
      isWatched: episode.playbackState?.isWatched ?? false,
    );
  }

  String _resumeLabel(Series series, EpisodeListItem target) {
    final season = _episodeSeasonMap[target.id];
    final label = season == null
        ? 'Episode ${target.episodeNumber}'
        : 'S${_pad(season)}E${_pad(target.episodeNumber)}';
    final progress = _progressFor(series, target.id);
    if (progress != null && progress.position > 30) {
      final mins = progress.position ~/ 60;
      final secs = (progress.position % 60).toString().padLeft(2, '0');
      return 'Resume $label · $mins:$secs';
    }
    return 'Play $label';
  }

  EpisodePlaybackState? _progressFor(Series series, int episodeId) {
    for (final season in series.seasons) {
      for (final episode in season.episodes) {
        if (episode.id == episodeId) return episode.playbackState;
      }
    }
    return null;
  }

  void _playEpisode(EpisodeListItem episode) {
    final apiClient = ref.read(apiClientProvider.notifier);
    final streamUrl = apiClient.getStreamUrl(episode.id, 'episode');
    // Build the label from season/episode numbers, not the database id.
    final seasonNumber = _episodeSeasonMap[episode.id];
    final label = seasonNumber == null
        ? 'Episode ${episode.episodeNumber}'
        : 'S${_pad(seasonNumber)}E${_pad(episode.episodeNumber)}';
    // FR-3: the queue continues through the season and into the next one, so
    // an episode ending offers the next episode automatically.
    final series = _detail ?? widget.series;
    final queue = buildEpisodeQueue(series, episodeId: episode.id);
    openFullscreenPlayback(
      context,
      streamUrl: streamUrl,
      title: '${widget.series.title} — $label',
      mediaId: episode.id,
      mediaType: 'episode',
      queue: queue,
    );
  }

  Future<void> _searchEpisode(EpisodeListItem episode) async {
    final seasonNumber = _episodeSeasonMap[episode.id] ?? 1;
    final client = ref.read(apiClientProvider.notifier);
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          'Searching for S${_pad(seasonNumber)}E${_pad(episode.episodeNumber)}…',
        ),
      ),
    );
    try {
      final releases = await client.searchReleases(
        query: widget.series.title,
        type: MediarrApiClient.searchTypeTv,
        season: seasonNumber,
        episode: episode.episodeNumber,
      );
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            releases.isEmpty
                ? 'No releases found for this episode'
                : '${releases.length} release(s) found for this episode',
          ),
        ),
      );
    } catch (error, stack) {
      unawaited(ref.read(errorReporterProvider).report(
            message: 'episode release search failed: $error',
            stack: stack.toString(),
            route: '/series/${widget.series.id}',
            context: {'episodeId': episode.id, 'season': seasonNumber},
          ));
      messenger.showSnackBar(
        const SnackBar(content: Text('Release search failed')),
      );
    }
  }

  String _pad(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    final series = _detail ?? widget.series;

    return NetflixScaffold(
      child: Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        body: _loading
            ? const Center(
                child: CircularProgressIndicator(
                  color: MediarrColors.accentPrimary,
                ),
              )
            : _error != null
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.error,
                      color: MediarrColors.statusError,
                      size: 48,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Error loading series detail',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      style: const TextStyle(color: MediarrColors.textMuted),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _loadDetail,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              )
            : _buildContent(context, series),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Series series) {
    final actions = <ActionBarAction>[
      ActionBarAction(
        label: 'Search All Missing',
        icon: Icons.search,
        onPressed: () async {
          final client = ref.read(apiClientProvider.notifier);
          final messenger = ScaffoldMessenger.of(context);
          messenger.showSnackBar(
            const SnackBar(content: Text('Searching for missing episodes…')),
          );
          try {
            final releases = await client.searchReleases(
              query: series.title,
              type: MediarrApiClient.searchTypeTv,
              year: series.year,
            );
            messenger.showSnackBar(
              SnackBar(
                content: Text(
                  releases.isEmpty
                      ? 'No releases found'
                      : '${releases.length} release(s) found',
                ),
              ),
            );
          } catch (error, stack) {
            unawaited(ref.read(errorReporterProvider).report(
                  message: 'series release search failed: $error',
                  stack: stack.toString(),
                  route: '/series/${series.id}',
                ));
            messenger.showSnackBar(
              const SnackBar(content: Text('Release search failed')),
            );
          }
        },
      ),
      ActionBarAction(
        label: 'Delete Series',
        icon: Icons.delete,
        isDestructive: true,
        onPressed: () async {
          final client = ref.read(apiClientProvider.notifier);
          await client.deleteSeries(series.id);
        },
      ),
    ];

    final resumeTarget = _resumeTarget(series);
    final resumeSeason = resumeTarget == null
        ? null
        : _episodeSeasonMap[resumeTarget.id];

    // Library tracking: how much of the show the viewer has finished. The
    // server already sends per-episode playback state; this makes it visible
    // without opening the season.
    final allEpisodes = series.seasons
        .expand((season) => season.episodes)
        .toList(growable: false);
    final watchedEpisodes =
        allEpisodes.where((episode) => episode.playbackState?.isWatched == true).length;

    // Two-pane TV layout. The previous single scrolling column put a 340 px
    // banner, the synopsis, the file-info card and the season chips above the
    // episodes, so the first episode row began ~1000 px down a 720 px screen
    // and the owner had to arrow blindly to reach it (report 2026-11-07:
    // "everything is too small and off screen until I arrow down to it").
    // Splitting the page keeps the episode list — the thing a viewer came for
    // — on screen from the first frame.
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ---- Left: artwork, title, metadata, series-level actions ----
        Expanded(
          flex: 4,
          child: SingleChildScrollView(
            child: Focus(
              // FR-2: key anchor for the Down-from-header hop. `canRequestFocus`
              // is false so it is never a traversal stop itself.
              canRequestFocus: false,
              skipTraversal: true,
              onKeyEvent: _handleKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 0, 0),
                    child: FocusableAction(
                      variant: FocusableActionVariant.button,
                      onFocusChange: (focused) => _backFocused = focused,
                      onSelect: () => Navigator.of(context).pop(),
                      borderRadius: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                        color: MediarrColors.surfaceCard,
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.arrow_back,
                              size: 28,
                              color: MediarrColors.textPrimary,
                            ),
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
                    posterUrl: series.posterUrl,
                    title: series.title,
                    subtitle: (series.year ?? 0) > 0 ? '$series.year' : null,
                    height: 240,
                  ),
                  if (resumeTarget != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: FocusableAction(
                        autofocus: true,
                        variant: FocusableActionVariant.button,
                        onFocusChange: (focused) => _ctaFocused = focused,
                        onSelect: () => _playEpisode(resumeTarget),
                        borderRadius: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 14,
                          ),
                          decoration: BoxDecoration(
                            color: MediarrColors.accentPrimary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.play_arrow,
                                  size: 32, color: Colors.white),
                              const SizedBox(width: 10),
                              Flexible(
                                child: Text(
                                  _resumeLabel(series, resumeTarget),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  MetadataSection(
                    synopsis: series.overview,
                    network: series.network,
                  ),
                  if (allEpisodes.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 4,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            watchedEpisodes == 0
                                ? 'Not started'
                                : '$watchedEpisodes of ${allEpisodes.length} watched',
                            style: const TextStyle(
                              color: MediarrColors.textSecondary,
                              fontSize: 18,
                            ),
                          ),
                          if (watchedEpisodes > 0) ...[
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(3),
                              child: LinearProgressIndicator(
                                value: watchedEpisodes / allEpisodes.length,
                                minHeight: 5,
                                backgroundColor:
                                    Colors.white.withValues(alpha: 0.16),
                                valueColor: const AlwaysStoppedAnimation(
                                  MediarrColors.accentPrimary,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  if (series.seasons.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      child: FileInfoCard(sizeBytes: series.sizeOnDisk),
                    ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: ActionBar(
                      actions: actions,
                      firstActionFocusNode: _firstActionFocusNode,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        // ---- Right: seasons + episodes, visible immediately ----
        Expanded(
          flex: 6,
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 16, 16, 16),
              child: EpisodeList(
                key: _episodeListKey,
                data: _buildEpisodeData(series),
                selectedSeasonNumber: resumeSeason,
                onPlayEpisode: _playEpisode,
                onSearchEpisode: _searchEpisode,
                onExitDown: () => _firstActionFocusNode.requestFocus(),
              ),
            ),
          ),
        ),
      ],
    );
  }

  EpisodeListSeason _buildEpisodeData(Series series) {
    _episodeSeasonMap.clear();
    return EpisodeListSeason(
      seasons: series.seasons.map((season) {
        for (final ep in season.episodes) {
          _episodeSeasonMap[ep.id] = season.seasonNumber;
        }
        return EpisodeListSeasonData(
          seasonNumber: season.seasonNumber,
          totalCount: season.episodeCount,
          onDiskCount: season.episodeFileCount,
          episodes: season.episodes.map((ep) {
            return EpisodeListItem(
              id: ep.id,
              episodeNumber: ep.episodeNumber,
              title: ep.title,
              airDateUtc: ep.airDateUtc,
              hasFile: ep.effectiveHasFile,
              quality: ep.quality,
              // Library tracking: the row needs the playback state the API
              // already returns, or watched episodes look identical to new
              // ones (the earlier wiring only covered the resume helper).
              progress: ep.playbackState?.progress ?? 0,
              isWatched: ep.playbackState?.isWatched ?? false,
              thumbUrl: ep.thumbUrl,
            );
          }).toList(),
        );
      }).toList(),
    );
  }
}

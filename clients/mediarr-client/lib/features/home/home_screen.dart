import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../playback/playback_queue.dart';
import '../../shared/models/library_item.dart';
import '../../shared/models/movie.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../../shared/utils/async_value_ext.dart';
import '../library/continue_watching_section.dart';
import '../library/movie_detail_screen.dart';
import '../library/see_all_screen.dart';
import '../library/series_detail_screen.dart';
import '../playback/playback_navigation.dart';
import '../playback/playback_screen.dart';

/// Provider for upcoming releases (used in hero banner selection).
final upcomingProvider = FutureProvider<List<UpcomingItem>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getUpcoming();
});

/// Provider for "Recently Added" media.
///
/// Phase 4b follow-up: this previously fetched the ActivityEvent log
/// (download/import events with "Newest"/"Older" labels). It now hits
/// `/api/media/library?sortBy=added&sortDir=desc` to surface real recently
/// added MEDIA items (movies + episodes + series) as poster cards.
final recentlyAddedProvider = FutureProvider<List<LibraryItem>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  final result = await client.getLibrary(
    sortBy: 'added',
    sortDir: 'desc',
    pageSize: 20,
  );
  return result.items;
});

/// Provider for the Movies row on the home screen.
final homeMoviesProvider = FutureProvider<List<Movie>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getMovies();
});

/// Provider for the TV Shows row on the home screen.
final homeSeriesProvider = FutureProvider<List<Series>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getSeries();
});

/// Provider for the featured movie behind the hero (FR-2).
///
/// Supplies year, runtime, quality, and landscape art for the meta line,
/// chips, synopsis, and backdrop. Returns null for series and episode heroes.
final heroMovieProvider = FutureProvider.family<Movie?, int>((ref, mediaId) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getMovie(mediaId);
});

/// Provider for the featured series behind the hero (FR-2, FR-14).
///
/// Episode heroes resolve their series for year, overview, quality, and
/// landscape art. Returns null for movie heroes.
final heroSeriesProvider = FutureProvider.family<Series?, int>((ref, seriesId) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getSeriesById(seriesId);
});

/// Netflix-style home screen.
///
/// Layout:
///   * Full-bleed hero banner (backdrop + title + synopsis + Play / More Info)
///   * Continue Watching horizontal row (D-pad scrollable)
///   * Recently Added horizontal row (real media items)
///   * Movies horizontal row
///   * TV Shows horizontal row
///
/// D-pad contract:
///   * On screen entry, the hero Play button autofocuses.
///   * Down moves focus to the first row's first poster.
///   * Left/Right scrolls the focused row.
///   * Up/Down moves between rows.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _heroPlayFocusNode = FocusNode(debugLabel: 'HomeScreen.hero.play');
  final _heroInfoFocusNode = FocusNode(debugLabel: 'HomeScreen.hero.info');

  @override
  void dispose() {
    _heroPlayFocusNode.dispose();
    _heroInfoFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final continueWatchingAsync = ref.watch(continueWatchingProvider);
    final recentlyAddedAsync = ref.watch(recentlyAddedProvider);
    final moviesAsync = ref.watch(homeMoviesProvider);
    final seriesAsync = ref.watch(homeSeriesProvider);

    // Phase 4b follow-up: the hero now shows a real media item. We prefer a
    // continue-watching entry (so Play resumes); otherwise the first
    // recently-added media item. The fallback generic "Welcome" copy is
    // only used when neither source has data yet.
    final continueWatching =
        continueWatchingAsync.dataOrNull ?? const <ContinueWatchingItem>[];
    final recentlyAdded =
        recentlyAddedAsync.dataOrNull ?? const <LibraryItem>[];
    final _HeroItem? recentItem = continueWatching.isNotEmpty
        ? _HeroFromContinueWatching(continueWatching.first)
        : (recentlyAdded.isNotEmpty ? _HeroFromLibrary(recentlyAdded.first) : null);

    // Hero metadata (FR-2): the featured movie supplies year, runtime, and
    // quality. Fields the API does not provide stay hidden.
    final heroMovieId = switch (recentItem) {
      _HeroFromContinueWatching(:final item) =>
        item.mediaTypeQueryValue == 'movie' ? item.mediaId : null,
      _HeroFromLibrary(:final item) => item.type == 'movie' ? item.id : null,
      null => null,
    };
    final heroSeriesId = switch (recentItem) {
      _HeroFromContinueWatching(:final item) =>
        item.mediaTypeQueryValue == 'episode' ? item.seriesId : null,
      _HeroFromLibrary(:final item) => item.type == 'series' ? item.id : null,
      null => null,
    };
    final heroMovie = heroMovieId == null
        ? null
        : ref.watch(heroMovieProvider(heroMovieId)).dataOrNull;
    final heroSeries = heroSeriesId == null
        ? null
        : ref.watch(heroSeriesProvider(heroSeriesId)).dataOrNull;

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _HeroBanner(
              item: recentItem,
              movie: heroMovie,
              series: heroSeries,
              playFocusNode: _heroPlayFocusNode,
              infoFocusNode: _heroInfoFocusNode,
              onPlay: () => _playHero(recentItem),
              onMoreInfo: () {
                if (recentItem == null) return;
                _openHeroDetail(context, ref, recentItem);
              },
            ),
            const SizedBox(height: 12),
            if (continueWatching.isNotEmpty)
              ContinueWatchingSection(
                items: continueWatching,
                isLoading: continueWatchingAsync.isLoading,
                onResume: (item) => _resumeContinueWatching(context, ref, item),
              ),
            const SizedBox(height: 12),
            _RowSection(
              title: 'Recently Added',
              onSeeAll: () => Navigator.of(context, rootNavigator: true).push(
                MaterialPageRoute(
                  builder: (_) => const SeeAllScreen(title: 'Recently Added'),
                ),
              ),
              child: _RecentlyAddedRow(
                items: recentlyAdded,
                onOpen: (item) => _openLibraryItem(context, ref, item),
              ),
            ),
            const SizedBox(height: 12),
            _RowSection(
              title: 'Movies',
              onSeeAll: () => context.go(AppRoutes.movies),
              child: _MoviePosterRow(
                moviesAsync: moviesAsync,
                onOpen: (m) => _openMovie(context, m),
              ),
            ),
            const SizedBox(height: 12),
            _RowSection(
              title: 'TV Shows',
              onSeeAll: () => context.go(AppRoutes.series),
              child: _SeriesPosterRow(
                seriesAsync: seriesAsync,
                onOpen: (s) => _openSeries(context, s),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _playHero(_HeroItem? item) {
    if (item == null) return;
    if (item is _HeroFromContinueWatching) {
      _resumeContinueWatching(context, ref, item.item);
      return;
    }
    final lib = (item as _HeroFromLibrary).item;
    final type = lib.type.toLowerCase();
    if (type != 'movie' && type != 'episode') return;
    final client = ref.read(apiClientProvider.notifier);
    final streamUrl = client.getStreamUrl(lib.id, type);
    openFullscreenPlayback(
      context,
      streamUrl: streamUrl,
      title: lib.title,
      mediaId: lib.id,
      mediaType: type,
    );
  }

  void _openHeroDetail(BuildContext context, WidgetRef ref, _HeroItem item) {
    if (item is _HeroFromContinueWatching) {
      _resumeContinueWatching(context, ref, item.item);
      return;
    }
    final lib = (item as _HeroFromLibrary).item;
    _openLibraryItem(context, ref, lib);
  }

  Future<void> _openLibraryItem(
      BuildContext context, WidgetRef ref, LibraryItem lib) async {
    final client = ref.read(apiClientProvider.notifier);
    final navigator = Navigator.of(context, rootNavigator: true);
    if (lib.type == 'movie') {
      final movie = await client.getMovie(lib.id);
      if (movie != null && mounted) {
        navigator.push(
          MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)),
        );
      }
    } else if (lib.type == 'series') {
      final series = await client.getSeriesById(lib.id);
      if (series != null && mounted) {
        navigator.push(
          MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: series)),
        );
      }
    } else if (lib.type == 'episode') {
      final type = lib.type.toLowerCase();
      final streamUrl = client.getStreamUrl(lib.id, type);
      navigator.push(
        MaterialPageRoute(
          builder: (_) => PlaybackScreen(
            streamUrl: streamUrl,
            mediaId: lib.id,
            mediaType: type,
            title: lib.title,
          ),
        ),
      );
    }
  }

  /// Resumes a Continue Watching entry.
  ///
  /// FR-3b: when the entry is an episode, this also fetches the series detail
  /// and builds the same queue the series detail screen builds. Before this,
  /// the resume path pushed playback with an empty queue, so an episode
  /// resumed from Home reached the completed overlay and stopped — the owner
  /// reported exactly that on 2026-10-03.
  Future<void> _resumeContinueWatching(
    BuildContext context,
    WidgetRef ref,
    ContinueWatchingItem item,
  ) async {
    final client = ref.read(apiClientProvider.notifier);
    final streamUrl = client.getStreamUrl(item.mediaId, item.mediaTypeQueryValue);

    var queue = const <PlaybackQueueItem>[];
    if (item.mediaTypeQueryValue == 'episode' && item.seriesId != null) {
      try {
        final series = await client.getSeriesDetail(item.seriesId!);
        if (series != null) {
          queue = buildEpisodeQueue(series, episodeId: item.mediaId);
        }
      } catch (_) {
        // Resume must still work when the detail fetch fails; it just loses
        // autoplay for this playback.
      }
    }

    if (!context.mounted) return;
    openFullscreenPlayback(
      context,
      streamUrl: streamUrl,
      title: item.title,
      mediaId: item.mediaId,
      mediaType: item.mediaTypeQueryValue,
      queue: queue,
    );
  }

  void _openMovie(BuildContext context, Movie movie) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)),
    );
  }

  void _openSeries(BuildContext context, Series series) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: series)),
    );
  }
}

/// Section header + horizontally scrollable row.
///
/// No `Focus` wrapper here: a bare `Focus` node is a traversal stop with no
/// focus cue, and used to swallow every Down press (F1).
class _RowSection extends StatelessWidget {
  const _RowSection({
    required this.title,
    required this.child,
    this.onSeeAll,
  });

  final String title;
  final Widget child;

  /// `See All >` action (FR-4). Omitted where no grid screen matches.
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              if (onSeeAll != null)
                FocusableAction(
                  onSelect: onSeeAll,
                  variant: FocusableActionVariant.button,
                  borderRadius: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'See All',
                          style: TextStyle(
                            color: MediarrColors.textSecondary,
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(width: 2),
                        Icon(Icons.chevron_right,
                            color: MediarrColors.textSecondary, size: 22),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

/// Internal hero-item union so the banner can accept either a continue-watching
/// item (preferred for "Play = resume") or a freshly added library item.
sealed class _HeroItem {
  const _HeroItem();
}

class _HeroFromContinueWatching extends _HeroItem {
  const _HeroFromContinueWatching(this.item);
  final ContinueWatchingItem item;
}

class _HeroFromLibrary extends _HeroItem {
  const _HeroFromLibrary(this.item);
  final LibraryItem item;
}

/// Full-bleed hero banner with Play + More Info actions.
class _HeroBanner extends StatelessWidget {
  const _HeroBanner({
    required this.item,
    required this.movie,
    required this.series,
    required this.playFocusNode,
    required this.infoFocusNode,
    required this.onPlay,
    required this.onMoreInfo,
  });

  final _HeroItem? item;
  final Movie? movie;
  final Series? series;
  final FocusNode playFocusNode;
  final FocusNode infoFocusNode;
  final VoidCallback onPlay;
  final VoidCallback onMoreInfo;

  String get _title {
    final i = item;
    if (i == null) return 'Welcome to Mediarr';
    if (i is _HeroFromContinueWatching) return i.item.title;
    return (i as _HeroFromLibrary).item.title;
  }

  /// Only a real landscape backdrop. A portrait poster must never be cropped
  /// into the banner (F11): it is shown as a poster tile instead. Landscape
  /// art comes from the movie/series detail response (`backdropUrl`) or from
  /// the continue-watching entry (FR-14).
  String? get _backdropUrl {
    final i = item;
    if (i == null) return null;
    if (i is _HeroFromContinueWatching) {
      return i.item.backdropUrl ?? movie?.backdropUrl ?? series?.backdropUrl;
    }
    return movie?.backdropUrl ?? series?.backdropUrl;
  }

  String? get _posterUrl {
    final i = item;
    if (i == null) return null;
    if (i is _HeroFromContinueWatching) return i.item.posterUrl;
    return (i as _HeroFromLibrary).item.posterUrl;
  }

  String? get _overview {
    final i = item;
    if (i is _HeroFromLibrary) {
      return (i).item.overview ?? movie?.overview ?? series?.overview;
    }
    return movie?.overview ?? series?.overview;
  }

  /// Runtime in minutes: the metadata field when the API provides one,
  /// otherwise the played duration of a continue-watching entry.
  int? get _runtimeMinutes {
    final runtime = movie?.runtime;
    if (runtime != null && runtime > 0) return runtime;
    final i = item;
    if (i is _HeroFromContinueWatching) {
      final minutes = i.item.duration ~/ 60;
      if (minutes > 0) return minutes;
    }
    return null;
  }

  /// Metadata line (FR-2): `2024 | Sci-Fi | 2h 4m`, built only from fields
  /// the API provides. Episode entries lead with `S09E09`; the runtime falls
  /// back to the played duration when no runtime field exists.
  String? get _metaLine {
    final parts = <String>[];
    final i = item;
    if (i is _HeroFromContinueWatching) {
      final w = i.item;
      final isEpisode = w.mediaTypeQueryValue == 'episode';
      if (isEpisode && w.seasonNumber != null && w.episodeNumber != null) {
        parts.add('S${w.seasonNumber.toString().padLeft(2, '0')}'
            'E${w.episodeNumber.toString().padLeft(2, '0')}');
      }
      final year = movie?.year ?? series?.year;
      if (year != null) parts.add(year.toString());
      if (!isEpisode) parts.add(_typeLabel(w.mediaType));
      final runtime = _runtimeMinutes;
      if (runtime != null) parts.add(_runtimeLabel(runtime));
    } else if (i is _HeroFromLibrary) {
      final lib = i.item;
      if (lib.year != null) parts.add(lib.year.toString());
      parts.add(_typeLabel(lib.type));
      final runtime = _runtimeMinutes;
      if (runtime != null) parts.add(_runtimeLabel(runtime));
    }
    return parts.isEmpty ? null : parts.join(' | ');
  }

  /// Quality chips (FR-2). The API exposes no rating field today, so the
  /// `PG-13` chip stays hidden until one exists. An `Any` quality profile is
  /// no quality signal, so it hides the chips instead of claiming `SD`.
  List<String> get _chips {
    final quality = (movie?.quality ?? series?.quality)?.toLowerCase();
    if (quality == null || quality.isEmpty || quality == 'any') return const [];
    final chips = <String>[];
    if (quality.contains('2160') || quality.contains('4k')) {
      chips.add('4K');
    }
    if (quality.contains('1080') ||
        quality.contains('720') ||
        quality.contains('hd')) {
      chips.add('HD');
    }
    if (chips.isEmpty) chips.add('SD');
    return chips;
  }

  bool get _hasProgress => item is _HeroFromContinueWatching;

  /// FR-2: `Resume` when the title has playback progress, else `Play`.
  String get _primaryLabel => _hasProgress ? 'Resume' : 'Play';

  String _typeLabel(String type) =>
      type.isEmpty ? type : type[0].toUpperCase() + type.substring(1);

  String _runtimeLabel(int minutes) {
    final hours = minutes ~/ 60;
    final rest = minutes % 60;
    return hours > 0 ? '${hours}h ${rest}m' : '${rest}m';
  }

  @override
  Widget build(BuildContext context) {
    final backdrop = _backdropUrl;
    final poster = _posterUrl;
    final hasOverview = _overview?.isNotEmpty ?? false;
    // FR-14: the hero fills the mockup's top band (about 48 % of the view)
    // and always keeps room for the two-line title, the meta line, the
    // three-line synopsis, and the action row.
    final viewportHeight = MediaQuery.sizeOf(context).height;
    final band = hasOverview ? 0.48 : 0.42;
    final contentMin = hasOverview ? 348.0 : 280.0;
    final height = (viewportHeight * band).clamp(contentMin, 520.0);
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (backdrop != null)
            CachedNetworkImage(
              imageUrl: backdrop,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: MediarrColors.surfaceCard),
              errorWidget: (_, __, ___) =>
                  Container(color: MediarrColors.surfaceCard),
            )
          else
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [MediarrColors.surfaceElevated, MediarrColors.surfaceBase],
                ),
              ),
            ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  Color(0xCC000000),
                  Color(0x55000000),
                  Color(0x00000000),
                ],
                stops: [0.0, 0.58, 1.0],
              ),
            ),
          ),
          // Portrait posters render as a tile, never cropped into the banner.
          if (backdrop == null && poster != null)
            Positioned(
              right: 48,
              top: 24,
              bottom: 24,
              child: AspectRatio(
                aspectRatio: 2 / 3,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                    imageUrl: poster,
                    fit: BoxFit.cover,
                    placeholder: (_, __) =>
                        Container(color: MediarrColors.surfaceCard),
                    errorWidget: (_, __, ___) =>
                        Container(color: MediarrColors.surfaceCard),
                  ),
                ),
              ),
            ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x99000000),
                  Color(0x66000000),
                  Color(0xCC000000),
                ],
                stops: [0.0, 0.45, 1.0],
              ),
            ),
          ),
          Positioned(
            left: 48,
            right: 48,
            top: 32,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'FEATURED',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 3,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 48,
                    height: 1.05,
                    fontWeight: FontWeight.w800,
                    shadows: [
                      Shadow(blurRadius: 12, color: Colors.black),
                    ],
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (_metaLine != null || _chips.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      if (_metaLine != null)
                        Flexible(
                          child: Text(
                            _metaLine!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 18,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      for (final chip in _chips) ...[
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: Colors.white54),
                          ),
                          child: Text(
                            chip,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
                if (_overview != null && _overview!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    _overview!,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 18,
                      height: 1.3,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    _HeroActionPill(
                      focusNode: playFocusNode,
                      autofocus: true,
                      onSelect: onPlay,
                      icon: Icons.play_arrow,
                      label: _primaryLabel,
                      gradient: const LinearGradient(
                        colors: [Color(0xFF7FB2FF), Color(0xFF4E8DF5)],
                      ),
                      foreground: const Color(0xFF0A1424),
                    ),
                    const SizedBox(width: 16),
                    _HeroActionPill(
                      focusNode: infoFocusNode,
                      onSelect: onMoreInfo,
                      icon: Icons.info_outline,
                      label: 'Details',
                      foreground: Colors.white,
                      border: Border.all(color: Colors.white24),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One hero action pill (FR-2). Both actions share the geometry, so the
/// mockup's equal pill sizes hold whatever the text metrics are.
class _HeroActionPill extends StatelessWidget {
  const _HeroActionPill({
    required this.focusNode,
    required this.onSelect,
    required this.icon,
    required this.label,
    required this.foreground,
    this.autofocus = false,
    this.gradient,
    this.border,
  });

  final FocusNode focusNode;
  final VoidCallback onSelect;
  final IconData icon;
  final String label;
  final Color foreground;
  final bool autofocus;
  final Gradient? gradient;
  final Border? border;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      focusNode: focusNode,
      autofocus: autofocus,
      onSelect: onSelect,
      borderRadius: 12,
      scale: 1.04,
      child: Container(
        height: 52,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        decoration: BoxDecoration(
          gradient: gradient,
          color: gradient == null ? const Color(0xFF1B2430) : null,
          borderRadius: BorderRadius.circular(12),
          border: border,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: foreground, size: 28),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: foreground,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentlyAddedRow extends StatelessWidget {
  const _RecentlyAddedRow({required this.items, required this.onOpen});

  final List<LibraryItem> items;
  final void Function(LibraryItem item) onOpen;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text(
          'No recent media',
          style: TextStyle(color: MediarrColors.textMuted),
        ),
      );
    }
    // FR-4: landscape cards with a bottom title bar (the mockup's row).
    return SizedBox(
      height: 140,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final item = items[index];
          return SizedBox(
            width: 240,
            child: _LibraryPosterCard(
              item: item,
              onSelect: () => onOpen(item),
            ),
          );
        },
      ),
    );
  }
}

/// Landscape "Recently Added" card (owner mockup 2026-09-24, FR-4): 16:9
/// artwork with a bottom title bar over a dark scrim.
class _LibraryPosterCard extends StatelessWidget {
  const _LibraryPosterCard({required this.item, required this.onSelect});

  final LibraryItem item;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      onSelect: onSelect,
      borderRadius: 12,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (item.posterUrl != null)
              CachedNetworkImage(
                imageUrl: item.posterUrl!,
                fit: BoxFit.cover,
                placeholder: (_, __) =>
                    Container(color: MediarrColors.surfaceCard),
                errorWidget: (_, __, ___) =>
                    Container(color: MediarrColors.surfaceCard),
              )
            else
              Container(color: MediarrColors.surfaceCard),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x00000000), Color(0xCC000000)],
                  stops: [0.5, 1.0],
                ),
              ),
            ),
            Positioned(
              left: 14,
              right: 14,
              bottom: 12,
              child: Text(
                item.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  shadows: [Shadow(blurRadius: 8, color: Colors.black)],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MoviePosterRow extends StatelessWidget {
  const _MoviePosterRow({
    required this.moviesAsync,
    required this.onOpen,
  });

  final AsyncValue<List<Movie>> moviesAsync;
  final void Function(Movie movie) onOpen;

  @override
  Widget build(BuildContext context) {
    return moviesAsync.when(
      loading: () => const SizedBox(
        height: 380,
        child: Center(
          child: CircularProgressIndicator(color: MediarrColors.accentPrimary),
        ),
      ),
      error: (_, __) => const SizedBox(
        height: 80,
        child: Center(
          child: Text(
            'Failed to load movies',
            style: TextStyle(color: MediarrColors.textMuted),
          ),
        ),
      ),
      data: (movies) {
        if (movies.isEmpty) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'No movies in library',
              style: TextStyle(color: MediarrColors.textMuted),
            ),
          );
        }
        return SizedBox(
          height: 380,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: movies.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final movie = movies[index];
              return SizedBox(
                width: 240,
                child: _MoviePosterCard(movie: movie, onSelect: () => onOpen(movie)),
              );
            },
          ),
        );
      },
    );
  }
}

class _MoviePosterCard extends StatelessWidget {
  const _MoviePosterCard({required this.movie, required this.onSelect});

  final Movie movie;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      onSelect: onSelect,
      borderRadius: 8,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: movie.posterUrl != null
                ? CachedNetworkImage(
                    imageUrl: movie.posterUrl!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) =>
                        Container(color: MediarrColors.surfaceCard),
                    errorWidget: (_, __, ___) => Container(
                      color: MediarrColors.surfaceCard,
                      child: const Center(
                        child: Icon(Icons.movie,
                            color: MediarrColors.textMuted, size: 32),
                      ),
                    ),
                  )
                : Container(
                    color: MediarrColors.surfaceCard,
                    child: const Center(
                      child: Icon(Icons.movie,
                          color: MediarrColors.textMuted, size: 32),
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  movie.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (movie.year != null)
                  Text(
                    movie.year!.toString(),
                    style: const TextStyle(
                      color: MediarrColors.textMuted,
                      fontSize: 18,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SeriesPosterRow extends StatelessWidget {
  const _SeriesPosterRow({
    required this.seriesAsync,
    required this.onOpen,
  });

  final AsyncValue<List<Series>> seriesAsync;
  final void Function(Series series) onOpen;

  @override
  Widget build(BuildContext context) {
    return seriesAsync.when(
      loading: () => const SizedBox(
        height: 380,
        child: Center(
          child: CircularProgressIndicator(color: MediarrColors.accentPrimary),
        ),
      ),
      error: (_, __) => const SizedBox(
        height: 80,
        child: Center(
          child: Text(
            'Failed to load series',
            style: TextStyle(color: MediarrColors.textMuted),
          ),
        ),
      ),
      data: (series) {
        if (series.isEmpty) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'No series in library',
              style: TextStyle(color: MediarrColors.textMuted),
            ),
          );
        }
        return SizedBox(
          height: 380,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: series.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final s = series[index];
              return SizedBox(
                width: 240,
                child: _SeriesPosterCard(series: s, onSelect: () => onOpen(s)),
              );
            },
          ),
        );
      },
    );
  }
}

class _SeriesPosterCard extends StatelessWidget {
  const _SeriesPosterCard({required this.series, required this.onSelect});

  final Series series;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      onSelect: onSelect,
      borderRadius: 8,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: series.posterUrl != null
                ? CachedNetworkImage(
                    imageUrl: series.posterUrl!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) =>
                        Container(color: MediarrColors.surfaceCard),
                    errorWidget: (_, __, ___) => Container(
                      color: MediarrColors.surfaceCard,
                      child: const Center(
                        child: Icon(Icons.tv,
                            color: MediarrColors.textMuted, size: 32),
                      ),
                    ),
                  )
                : Container(
                    color: MediarrColors.surfaceCard,
                    child: const Center(
                      child: Icon(Icons.tv,
                          color: MediarrColors.textMuted, size: 32),
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  series.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (series.year != null)
                  Text(
                    series.year!.toString(),
                    style: const TextStyle(
                      color: MediarrColors.textMuted,
                      fontSize: 18,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

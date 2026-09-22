import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/movie.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../library/continue_watching_section.dart';
import '../library/movie_detail_screen.dart';
import '../library/series_detail_screen.dart';
import '../playback/playback_screen.dart';

/// Provider for upcoming releases (used in hero banner selection).
final upcomingProvider = FutureProvider<List<UpcomingItem>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getUpcoming();
});

/// Provider for recent activity events (for "Recently Added" row).
final recentlyAddedProvider = FutureProvider<List<ActivityEvent>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getActivity(types: 'download,import', pageSize: 20);
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

/// Netflix-style home screen.
///
/// Layout:
///   * Full-bleed hero banner (backdrop + title + synopsis + Play / More Info)
///   * Continue Watching horizontal row (D-pad scrollable)
///   * Recently Added horizontal row
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
  final FocusNode _continueWatchingRowFocus =
      FocusNode(debugLabel: 'HomeScreen.continueWatching.row');
  final FocusNode _recentRowFocus =
      FocusNode(debugLabel: 'HomeScreen.recent.row');
  final FocusNode _moviesRowFocus =
      FocusNode(debugLabel: 'HomeScreen.movies.row');
  final FocusNode _seriesRowFocus =
      FocusNode(debugLabel: 'HomeScreen.series.row');

  @override
  void dispose() {
    _heroPlayFocusNode.dispose();
    _heroInfoFocusNode.dispose();
    _continueWatchingRowFocus.dispose();
    _recentRowFocus.dispose();
    _moviesRowFocus.dispose();
    _seriesRowFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final continueWatchingAsync = ref.watch(continueWatchingProvider);
    final upcomingAsync = ref.watch(upcomingProvider);
    final recentlyAddedAsync = ref.watch(recentlyAddedProvider);
    final moviesAsync = ref.watch(homeMoviesProvider);
    final seriesAsync = ref.watch(homeSeriesProvider);

    final upcoming = upcomingAsync.value ?? const <UpcomingItem>[];
    final hero = upcoming.isNotEmpty ? upcoming.first : null;

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _HeroBanner(
              item: hero,
              playFocusNode: _heroPlayFocusNode,
              infoFocusNode: _heroInfoFocusNode,
              onPlay: () => _playUpcoming(hero),
              onMoreInfo: () {
                if (hero == null) return;
                _openHeroDetail(context, ref, hero);
              },
            ),
            const SizedBox(height: 12),
            // Continue Watching has its own section header; wrap it in a Focus
            // node so D-pad traversal can land on its cards.
            if (continueWatchingAsync.value != null &&
                continueWatchingAsync.value!.isNotEmpty)
              Focus(
                focusNode: _continueWatchingRowFocus,
                child: ContinueWatchingSection(
                  items: continueWatchingAsync.value ?? const [],
                  isLoading: continueWatchingAsync.isLoading,
                  onResume: (item) => _resumeContinueWatching(context, ref, item),
                ),
              ),
            const SizedBox(height: 12),
            _RowSection(
              title: 'Recently Added',
              rowFocusNode: _recentRowFocus,
              child: _RecentlyAddedRow(events: recentlyAddedAsync.value ?? const []),
            ),
            const SizedBox(height: 12),
            _RowSection(
              title: 'Movies',
              rowFocusNode: _moviesRowFocus,
              child: _MoviePosterRow(
                moviesAsync: moviesAsync,
                onOpen: (m) => _openMovie(context, m),
              ),
            ),
            const SizedBox(height: 12),
            _RowSection(
              title: 'TV Shows',
              rowFocusNode: _seriesRowFocus,
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

  void _resumeContinueWatching(
    BuildContext context,
    WidgetRef ref,
    ContinueWatchingItem item,
  ) {
    final client = ref.read(apiClientProvider.notifier);
    final streamUrl = client.getStreamUrl(item.mediaId, item.mediaTypeQueryValue);
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlaybackScreen(
          streamUrl: streamUrl,
          mediaId: item.mediaId,
          mediaType: item.mediaTypeQueryValue,
          title: item.title,
        ),
      ),
    );
  }

  void _playUpcoming(UpcomingItem? item) {
    if (item == null) return;
    final client = ref.read(apiClientProvider.notifier);
    final type = item.type.toLowerCase() == 'episode' ? 'episode' : 'movie';
    final streamUrl = client.getStreamUrl(item.id, type);
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlaybackScreen(
          streamUrl: streamUrl,
          mediaId: item.id,
          mediaType: type,
          title: item.title,
        ),
      ),
    );
  }

  void _openHeroDetail(BuildContext context, WidgetRef ref, UpcomingItem item) {
    if (item.type.toLowerCase() == 'episode') {
      final client = ref.read(apiClientProvider.notifier);
      final streamUrl = client.getStreamUrl(item.id, 'episode');
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PlaybackScreen(
            streamUrl: streamUrl,
            mediaId: item.id,
            mediaType: 'episode',
            title: item.title,
          ),
        ),
      );
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => Scaffold(
            backgroundColor: MediarrColors.surfaceBase,
            appBar: AppBar(title: Text(item.title)),
            body: Center(
              child: Text(
                'Coming ${item.date}',
                style: const TextStyle(color: MediarrColors.textMuted),
              ),
            ),
          ),
        ),
      );
    }
  }

  void _openMovie(BuildContext context, Movie movie) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)),
    );
  }

  void _openSeries(BuildContext context, Series series) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: series)),
    );
  }
}

/// Section header + horizontally scrollable row.
class _RowSection extends StatelessWidget {
  const _RowSection({
    required this.title,
    required this.child,
    required this.rowFocusNode,
  });

  final String title;
  final Widget child;
  final FocusNode rowFocusNode;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          Focus(
            focusNode: rowFocusNode,
            child: child,
          ),
        ],
      ),
    );
  }
}

/// Full-bleed hero banner with Play + More Info actions.
class _HeroBanner extends StatelessWidget {
  const _HeroBanner({
    required this.item,
    required this.playFocusNode,
    required this.infoFocusNode,
    required this.onPlay,
    required this.onMoreInfo,
  });

  final UpcomingItem? item;
  final FocusNode playFocusNode;
  final FocusNode infoFocusNode;
  final VoidCallback onPlay;
  final VoidCallback onMoreInfo;

  @override
  Widget build(BuildContext context) {
    final backdrop = item?.posterUrl;
    return SizedBox(
      height: 420,
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
            Container(color: MediarrColors.surfaceCard),
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
            bottom: 36,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  item?.title ?? 'Welcome to Mediarr',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 40,
                    fontWeight: FontWeight.w800,
                    shadows: [
                      Shadow(blurRadius: 12, color: Colors.black),
                    ],
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Text(
                  item == null
                      ? 'Browse your library and start watching.'
                      : 'Coming ${item!.date}',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    FocusableAction(
                      focusNode: playFocusNode,
                      autofocus: true,
                      onSelect: onPlay,
                      borderRadius: 6,
                      scale: 1.04,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 28, vertical: 14),
                        color: Colors.white,
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.play_arrow,
                                color: Colors.black, size: 28),
                            SizedBox(width: 8),
                            Text(
                              'Play',
                              style: TextStyle(
                                color: Colors.black,
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    FocusableAction(
                      focusNode: infoFocusNode,
                      onSelect: onMoreInfo,
                      borderRadius: 6,
                      scale: 1.04,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 24, vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.18),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.5)),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.info_outline,
                                color: Colors.white, size: 24),
                            SizedBox(width: 8),
                            Text(
                              'More Info',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
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

class _RecentlyAddedRow extends StatelessWidget {
  const _RecentlyAddedRow({required this.events});

  final List<ActivityEvent> events;

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text(
          'No recent activity',
          style: TextStyle(color: MediarrColors.textMuted),
        ),
      );
    }
    return SizedBox(
      height: 130,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: events.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final event = events[index];
          return SizedBox(
            width: 240,
            child: FocusableAction(
              onSelect: () {},
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: MediarrColors.surfaceCard,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      event.success
                          ? Icons.check_circle
                          : Icons.error_outline,
                      color: event.success
                          ? MediarrColors.statusSuccess
                          : MediarrColors.statusError,
                      size: 28,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            event.summary,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: MediarrColors.textPrimary,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            event.sourceModule,
                            style: const TextStyle(
                              color: MediarrColors.textMuted,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
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
        height: 220,
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
          height: 220,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: movies.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final movie = movies[index];
              return _HomePosterCard(
                title: movie.title,
                subtitle: movie.year?.toString(),
                posterUrl: movie.posterUrl,
                onSelect: () => onOpen(movie),
              );
            },
          ),
        );
      },
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
        height: 220,
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
          height: 220,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: series.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final s = series[index];
              return _HomePosterCard(
                title: s.title,
                subtitle: s.year?.toString(),
                posterUrl: s.posterUrl,
                onSelect: () => onOpen(s),
              );
            },
          ),
        );
      },
    );
  }
}

class _HomePosterCard extends StatelessWidget {
  const _HomePosterCard({
    required this.title,
    required this.subtitle,
    required this.posterUrl,
    required this.onSelect,
  });

  final String title;
  final String? subtitle;
  final String? posterUrl;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: FocusableAction(
        onSelect: onSelect,
        borderRadius: 8,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: posterUrl != null
                  ? CachedNetworkImage(
                      imageUrl: posterUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) =>
                          Container(color: MediarrColors.surfaceCard),
                      errorWidget: (_, __, ___) =>
                          Container(color: MediarrColors.surfaceCard),
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
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        color: MediarrColors.textMuted,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

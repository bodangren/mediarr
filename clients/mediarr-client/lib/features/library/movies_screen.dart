import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../core/widgets/tv_context_menu.dart';
import '../../shared/models/movie.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/poster_card.dart';
import '../playback/playback_navigation.dart';
import 'collections_screen.dart';
import 'library_view_chip.dart';
import 'movie_detail_screen.dart';
import 'poster_grid.dart';

/// Server-side query for the movie library: search, sort and monitored filter.
class MovieLibraryQuery {
  const MovieLibraryQuery({
    this.search = '',
    this.sortBy = 'title',
    this.sortAsc = true,
    this.monitored,
  });

  final String search;
  final String sortBy;
  final bool sortAsc;
  final bool? monitored;

  MovieLibraryQuery copyWith({
    String? search,
    String? sortBy,
    bool? sortAsc,
    bool? monitored,
    bool clearMonitored = false,
  }) => MovieLibraryQuery(
    search: search ?? this.search,
    sortBy: sortBy ?? this.sortBy,
    sortAsc: sortAsc ?? this.sortAsc,
    monitored: clearMonitored ? null : (monitored ?? this.monitored),
  );
}

final movieLibraryQueryProvider = StateProvider<MovieLibraryQuery>(
  (ref) => const MovieLibraryQuery(),
);

/// Provider that fetches the movie list from the API for the current query.
final moviesProvider = FutureProvider<List<Movie>>((ref) async {
  final query = ref.watch(movieLibraryQueryProvider);
  final client = ref.read(apiClientProvider.notifier);
  return client.getMoviesFiltered(
    search: query.search,
    sortBy: query.sortBy,
    sortAsc: query.sortAsc,
    monitored: query.monitored,
  );
});

/// Movies library browsing screen — dense poster grid, D-pad navigable.
class MoviesScreen extends ConsumerStatefulWidget {
  const MoviesScreen({super.key});

  @override
  ConsumerState<MoviesScreen> createState() => _MoviesScreenState();
}

class _MoviesScreenState extends ConsumerState<MoviesScreen> {
  final _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode(
    debugLabel: 'MoviesScreen.search',
  );

  /// FR-4: the header's first control, the target of the Up hop from the grid.
  final FocusNode _collectionsFocusNode = FocusNode(
    debugLabel: 'MoviesScreen.collections',
  );

  /// Whether a poster tile currently holds focus.
  bool _gridFocused = false;

  Timer? _searchDebounce;

  /// One focus node per poster tile so Back from a movie detail returns the
  /// remote to the tile that opened it, not the first tile of the grid.
  final Map<int, FocusNode> _movieFocusNodes = {};

  FocusNode _nodeFor(Movie movie) => _movieFocusNodes.putIfAbsent(
    movie.id,
    () => FocusNode(debugLabel: 'MoviesScreen.movie.${movie.id}'),
  );

  @override
  void dispose() {
    _searchDebounce?.cancel();
    for (final node in _movieFocusNodes.values) {
      node.dispose();
    }
    _searchController.dispose();
    _searchFocusNode.dispose();
    _collectionsFocusNode.dispose();
    super.dispose();
  }

  /// FR-4: Up from the grid enters the header.
  ///
  /// Measured on the device: with two header controls, Up from a poster tile
  /// resolved geometrically onto the **rail**, not the header, which made the
  /// search field unreachable. The hop is therefore driven here instead of
  /// left to geometry.
  /// First focusable grid node, so leaving the search field lands on a visible
  /// control (FR-3/FR-4).
  FocusNode? _firstGridNode() {
    for (final node in _movieFocusNodes.values) {
      if (node.context != null) return node;
    }
    return null;
  }

  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    // Owner report 2026-11-17: "once I was in the search text area, I was unable
    // to leave". The field owns the arrows as cursor movement and system Back
    // only closes the IME, so the remote had no way out of the header. Down and
    // Back now hand focus back to the grid deterministically.
    if (_searchFocusNode.hasFocus &&
        (event.logicalKey == LogicalKeyboardKey.arrowDown ||
            event.logicalKey == LogicalKeyboardKey.escape ||
            event.logicalKey == LogicalKeyboardKey.goBack ||
            event.logicalKey == LogicalKeyboardKey.browserBack)) {
      _searchFocusNode.unfocus();
      _firstGridNode()?.requestFocus();
      return KeyEventResult.handled;
    }

    if (event.logicalKey != LogicalKeyboardKey.arrowUp) {
      return KeyEventResult.ignored;
    }
    if (!_gridFocused) return KeyEventResult.ignored;
    _collectionsFocusNode.requestFocus();
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final moviesAsync = ref.watch(moviesProvider);

    return NetflixScaffold(
      child: Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        // FR-4: key anchor for the Up hop from the grid into the header. It is
        // not a traversal stop itself.
        body: Focus(
          canRequestFocus: false,
          skipTraversal: true,
          onKeyEvent: _handleKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // FR-1: the header is compact (72 px, was 100) so the grid keeps
              // the vertical room that two complete poster rows need.
              // FR-4: the title is Flexible and the field shrinks on narrow
              // windows, because three fixed children overflowed the header.
              LayoutBuilder(
                builder: (context, constraints) {
                  final wide = constraints.maxWidth > 900;
                  return Padding(
                    padding: EdgeInsets.fromLTRB(
                      wide ? 24 : 16,
                      16,
                      wide ? 24 : 16,
                      8,
                    ),
                    child: Row(
                      children: [
                        Flexible(
                          child: Text(
                            'Movies',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: MediarrColors.textPrimary,
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const Spacer(),
                        // FR-4: collections are reached from here, which keeps the
                        // five-item rail from the owner mockup unchanged. A shelf row
                        // was the accepted option, but a ~200 px row would cost one
                        // of the two poster rows FR-1 requires.
                        FocusableAction(
                          focusNode: _collectionsFocusNode,
                          variant: FocusableActionVariant.button,
                          borderRadius: 8,
                          onSelect: () => Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const CollectionsScreen(),
                            ),
                          ),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: MediarrColors.surfaceCard,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: MediarrColors.borderSubtle,
                              ),
                            ),
                            child: const Text(
                              'Collections',
                              style: TextStyle(
                                color: MediarrColors.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        FocusableAction(
                          variant: FocusableActionVariant.button,
                          borderRadius: 8,
                          onSelect: () => _showViewMenu(context),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: MediarrColors.surfaceCard,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: MediarrColors.borderSubtle,
                              ),
                            ),
                            child: const Row(
                              children: [
                                Icon(
                                  Icons.tune,
                                  color: MediarrColors.textPrimary,
                                  size: 20,
                                ),
                                SizedBox(width: 6),
                                Text(
                                  'View',
                                  style: TextStyle(
                                    color: MediarrColors.textPrimary,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        SizedBox(
                          width: wide ? 320 : 180,
                          height: 48,
                          child: TextField(
                            // The FocusNode must belong to the TextField itself.
                            // A wrapper Focus keeps the input method from
                            // attaching, so the field accepted no text (F5).
                            focusNode: _searchFocusNode,
                            controller: _searchController,
                            onChanged: (value) {
                              _searchDebounce?.cancel();
                              _searchDebounce = Timer(
                                const Duration(milliseconds: 300),
                                () => ref
                                    .read(movieLibraryQueryProvider.notifier)
                                    .update(
                                      (query) =>
                                          query.copyWith(search: value.trim()),
                                    ),
                              );
                            },
                            decoration: InputDecoration(
                              hintText: 'Search...',
                              prefixIcon: const Icon(Icons.search, size: 22),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              filled: true,
                              fillColor: MediarrColors.surfaceCard,
                              contentPadding: EdgeInsets.zero,
                            ),
                            style: const TextStyle(
                              color: MediarrColors.textPrimary,
                              fontSize: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              // FR-1: Continue Watching was removed here. It measured 213 of the
              // 720 logical px of TV height, and two poster rows cannot fit in
              // the 407 px that remained. It stays on Home, where the owner
              // approved it. Pinned by poster_grid_density_test.dart.
              Expanded(
                child: moviesAsync.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(
                      color: MediarrColors.accentPrimary,
                    ),
                  ),
                  error: (error, _) => Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Failed to load movies: $error',
                          style: const TextStyle(
                            color: MediarrColors.textMuted,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 16),
                        FocusableAction(
                          variant: FocusableActionVariant.button,
                          autofocus: true,
                          onSelect: () => ref.invalidate(moviesProvider),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: MediarrColors.surfaceCard,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: MediarrColors.borderSubtle,
                              ),
                            ),
                            child: const Text(
                              'Retry',
                              style: TextStyle(
                                color: MediarrColors.textPrimary,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  data: (movies) {
                    final query = ref.watch(movieLibraryQueryProvider);
                    final filtered = movies;
                    if (filtered.isEmpty) {
                      final hasQuery =
                          query.search.isNotEmpty || query.monitored != null;
                      return Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              hasQuery
                                  ? 'No movies match "${query.search.isEmpty ? 'this filter' : query.search}"'
                                  : 'No movies in library',
                              style: const TextStyle(
                                color: MediarrColors.textMuted,
                                fontSize: 18,
                              ),
                            ),
                            if (hasQuery) ...[
                              const SizedBox(height: 16),
                              FocusableAction(
                                variant: FocusableActionVariant.button,
                                autofocus: true,
                                onSelect: () =>
                                    ref
                                            .read(
                                              movieLibraryQueryProvider
                                                  .notifier,
                                            )
                                            .state =
                                        const MovieLibraryQuery(),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                    vertical: 10,
                                  ),
                                  decoration: BoxDecoration(
                                    color: MediarrColors.surfaceCard,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: MediarrColors.borderSubtle,
                                    ),
                                  ),
                                  child: const Text(
                                    'Clear view',
                                    style: TextStyle(
                                      color: MediarrColors.textPrimary,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    }
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_hasActiveView(query))
                          _MovieViewChips(
                            query: query,
                            playable: filtered
                                .where((m) => m.effectiveHasFile)
                                .length,
                            onClearSearch: () {
                              _searchController.clear();
                              ref
                                  .read(movieLibraryQueryProvider.notifier)
                                  .update((q) => q.copyWith(search: ''));
                            },
                            onClear: () =>
                                ref
                                        .read(
                                          movieLibraryQueryProvider.notifier,
                                        )
                                        .state =
                                    const MovieLibraryQuery(),
                            onPlayFiltered: () =>
                                unawaited(_playFiltered(filtered)),
                          ),
                        Expanded(
                          child: LayoutBuilder(
                            builder: (context, constraints) {
                              final horizontalPadding =
                                  constraints.maxWidth > 900 ? 24.0 : 16.0;
                              return GridView.builder(
                                padding: EdgeInsets.fromLTRB(
                                  horizontalPadding,
                                  0,
                                  horizontalPadding,
                                  8,
                                ),
                                gridDelegate: posterGridDelegateFor(
                                  constraints.maxWidth - horizontalPadding * 2,
                                ),
                                itemCount: filtered.length,
                                itemBuilder: (context, index) {
                                  final movie = filtered[index];
                                  return PosterCard(
                                    focusNode: _nodeFor(movie),
                                    title: movie.title,
                                    posterUrl: movie.posterUrl,
                                    year: movie.year,
                                    quality: movie.quality,
                                    monitored: movie.monitored,
                                    hasFile: movie.hasFile,
                                    autofocus: index == 0,
                                    onFocusChange: (focused) =>
                                        _gridFocused = focused,
                                    onPressed: () => unawaited(
                                      _openMovieDetail(context, movie),
                                    ),
                                    onContextMenu: () => _openMovieMenu(movie),
                                    watched: movie.isWatched,
                                    subtitleAvailability: movie.hasFile
                                        ? movie.subtitleAvailability
                                        : null,
                                  );
                                },
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Whether the view is narrowed enough to show the active-view chips.
  bool _hasActiveView(MovieLibraryQuery query) =>
      query.search.isNotEmpty ||
      query.monitored != null ||
      query.sortBy != 'title' ||
      !query.sortAsc;

  /// One menu for sort + monitored filter (the TV header has no room for two more buttons).
  void _showViewMenu(BuildContext context) {
    final query = ref.read(movieLibraryQueryProvider);
    showTvContextMenu(
      context,
      title: 'Sort & filter',
      actions: [
        TvContextAction(
          label: query.sortBy == 'title' ? '✓ Title A–Z' : 'Title A–Z',
          onSelected: () => ref.read(movieLibraryQueryProvider.notifier).state =
              query.copyWith(sortBy: 'title', sortAsc: true),
        ),
        TvContextAction(
          label: query.sortBy == 'year' && !query.sortAsc
              ? '✓ Year (newest)'
              : 'Year (newest)',
          onSelected: () => ref.read(movieLibraryQueryProvider.notifier).state =
              query.copyWith(sortBy: 'year', sortAsc: false),
        ),
        TvContextAction(
          label: query.sortBy == 'added' && !query.sortAsc
              ? '✓ Recently added'
              : 'Recently added',
          onSelected: () => ref.read(movieLibraryQueryProvider.notifier).state =
              query.copyWith(sortBy: 'added', sortAsc: false),
        ),
        TvContextAction(
          label: query.monitored == null ? '✓ All movies' : 'All movies',
          onSelected: () => ref.read(movieLibraryQueryProvider.notifier).state =
              query.copyWith(clearMonitored: true),
        ),
        TvContextAction(
          label: query.monitored == true ? '✓ Monitored' : 'Monitored',
          onSelected: () => ref.read(movieLibraryQueryProvider.notifier).state =
              query.copyWith(monitored: true),
        ),
        TvContextAction(
          label: query.monitored == false ? '✓ Unmonitored' : 'Unmonitored',
          onSelected: () => ref.read(movieLibraryQueryProvider.notifier).state =
              query.copyWith(monitored: false),
        ),
      ],
    );
  }

  Future<void> _setWatched(Movie movie, bool watched) async {
    try {
      await ref
          .read(apiClientProvider.notifier)
          .setWatched(mediaType: 'movie', mediaId: movie.id, watched: watched);
      ref.invalidate(moviesProvider);
    } catch (_) {
      // The context-menu action failing must not take the library down; the list simply keeps its
      // previous state.
    }
  }

  void _openMovieMenu(Movie movie) {
    showTvContextMenu(
      context,
      title: movie.title,
      actions: [
        TvContextAction(
          label: 'Open details',
          onSelected: () => _openMovieDetail(context, movie),
        ),
        TvContextAction(
          label: 'Mark watched',
          onSelected: () => _setWatched(movie, true),
        ),
        TvContextAction(
          label: 'Mark unwatched',
          onSelected: () => _setWatched(movie, false),
        ),
      ],
    );
  }

  Future<void> _openMovieDetail(BuildContext context, Movie movie) async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)));
    if (!mounted) return;
    // Back from the detail returns to the poster that opened it.
    _movieFocusNodes[movie.id]?.requestFocus();
  }

  /// Plays the first downloaded movie of the current view ("Play filtered").
  Future<void> _playFiltered(List<Movie> movies) async {
    final playable = movies.where((movie) => movie.effectiveHasFile);
    if (playable.isEmpty) return;
    final first = playable.first;
    final client = ref.read(apiClientProvider.notifier);
    await openFullscreenPlayback(
      context,
      streamUrl: client.getStreamUrl(first.id, 'movie'),
      title: first.title,
      mediaId: first.id,
      mediaType: 'movie',
    );
    if (mounted) ref.invalidate(moviesProvider);
  }
}

/// Compact strip of the active search/sort/filter with the actions that only
/// make sense while a view is narrowed: Play filtered and Clear view.
///
/// It only mounts when the query is not the default, so the two-row poster
/// grid keeps its height at the TV viewport (poster_grid_density_test).
class _MovieViewChips extends StatelessWidget {
  const _MovieViewChips({
    required this.query,
    required this.playable,
    required this.onClearSearch,
    required this.onClear,
    required this.onPlayFiltered,
  });

  final MovieLibraryQuery query;
  final int playable;
  final VoidCallback onClearSearch;
  final VoidCallback onClear;
  final VoidCallback onPlayFiltered;

  @override
  Widget build(BuildContext context) {
    final sortLabel = switch ((query.sortBy, query.sortAsc)) {
      ('title', true) => null,
      ('year', false) => 'Year (newest)',
      ('added', false) => 'Recently added',
      _ => '${query.sortBy} ${query.sortAsc ? 'asc' : 'desc'}',
    };
    final chips = <Widget>[
      if (query.search.isNotEmpty)
        LibraryViewChip(label: '"${query.search}"', onSelect: onClearSearch),
      if (sortLabel != null)
        LibraryViewChip(label: sortLabel, onSelect: onClear),
      if (query.monitored != null)
        LibraryViewChip(
          label: query.monitored! ? 'Monitored' : 'Unmonitored',
          onSelect: onClear,
        ),
    ];
    if (chips.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 8),
      child: Row(
        children: [
          ...chips.expand((chip) => [chip, const SizedBox(width: 8)]),
          const Spacer(),
          if (playable > 0) ...[
            FocusableAction(
              variant: FocusableActionVariant.button,
              borderRadius: 8,
              onSelect: onPlayFiltered,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: MediarrColors.accentPrimary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.play_arrow, color: Colors.white, size: 20),
                    SizedBox(width: 6),
                    Text(
                      'Play filtered',
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
            const SizedBox(width: 8),
          ],
          FocusableAction(
            variant: FocusableActionVariant.button,
            borderRadius: 8,
            onSelect: onClear,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: MediarrColors.surfaceCard,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: MediarrColors.borderSubtle),
              ),
              child: const Text(
                'Clear view',
                style: TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

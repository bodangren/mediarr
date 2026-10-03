import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/movie.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/poster_card.dart';
import 'collections_screen.dart';
import 'movie_detail_screen.dart';
import 'poster_grid.dart';

/// Provider that fetches the movie list from the API.
final moviesProvider = FutureProvider<List<Movie>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getMovies();
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

  String _searchQuery = '';

  @override
  void dispose() {
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
  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    if (event.logicalKey != LogicalKeyboardKey.arrowUp) {
      return KeyEventResult.ignored;
    }
    if (!_gridFocused) return KeyEventResult.ignored;
    _collectionsFocusNode.requestFocus();
    return KeyEventResult.handled;
  }

  List<Movie> _filterMovies(List<Movie> movies) {
    if (_searchQuery.isEmpty) return movies;
    final query = _searchQuery.toLowerCase();
    return movies.where((m) => m.title.toLowerCase().contains(query)).toList();
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
                            onChanged: (value) =>
                                setState(() => _searchQuery = value),
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
                    child: Text(
                      'Failed to load movies: $error',
                      style: const TextStyle(color: MediarrColors.textMuted),
                    ),
                  ),
                  data: (movies) {
                    final filtered = _filterMovies(movies);
                    if (filtered.isEmpty) {
                      return Center(
                        child: Text(
                          _searchQuery.isEmpty
                              ? 'No movies in library'
                              : 'No movies match "$_searchQuery"',
                          style: const TextStyle(
                            color: MediarrColors.textMuted,
                            fontSize: 16,
                          ),
                        ),
                      );
                    }
                    // FR-1: the shared density contract resolves to 6 columns
                    // and 2 complete rows at the TV viewport.
                    return LayoutBuilder(
                      builder: (context, constraints) {
                        final horizontalPadding = constraints.maxWidth > 900
                            ? 24.0
                            : 16.0;
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
                              title: movie.title,
                              posterUrl: movie.posterUrl,
                              year: movie.year,
                              quality: movie.quality,
                              monitored: movie.monitored,
                              hasFile: movie.hasFile,
                              autofocus: index == 0,
                              onFocusChange: (focused) =>
                                  _gridFocused = focused,
                              onPressed: () => _openMovieDetail(context, movie),
                            );
                          },
                        );
                      },
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

  void _openMovieDetail(BuildContext context, Movie movie) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)));
  }
}

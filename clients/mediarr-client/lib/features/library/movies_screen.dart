import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/movie.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/poster_card.dart';
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
  final FocusNode _searchFocusNode =
      FocusNode(debugLabel: 'MoviesScreen.search');
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  List<Movie> _filterMovies(List<Movie> movies) {
    if (_searchQuery.isEmpty) return movies;
    final query = _searchQuery.toLowerCase();
    return movies
        .where((m) => m.title.toLowerCase().contains(query))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final moviesAsync = ref.watch(moviesProvider);

    return NetflixScaffold(
      child: Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // FR-1: the header is compact (72 px, was 100) so the grid keeps
            // the vertical room that two complete poster rows need.
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: Row(
                children: [
                  Text(
                    'Movies',
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: 320,
                    height: 48,
                    child: TextField(
                      // The FocusNode must belong to the TextField itself. A
                      // wrapper Focus keeps the input method from attaching,
                      // so the field accepted no text (F5).
                      focusNode: _searchFocusNode,
                      controller: _searchController,
                      onChanged: (value) => setState(() => _searchQuery = value),
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
            ),
            // FR-1: Continue Watching was removed here. It measured 213 of the
            // 720 logical px of TV height, and two poster rows cannot fit in
            // the 407 px that remained. It stays on Home, where the owner
            // approved it. Pinned by poster_grid_density_test.dart.
            Expanded(
              child: moviesAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(
                      color: MediarrColors.accentPrimary),
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
                      final horizontalPadding =
                          constraints.maxWidth > 900 ? 24.0 : 16.0;
                      return GridView.builder(
                        padding: EdgeInsets.fromLTRB(
                            horizontalPadding, 0, horizontalPadding, 8),
                        gridDelegate: posterGridDelegateFor(
                            constraints.maxWidth - horizontalPadding * 2),
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
    );
  }

  void _openMovieDetail(BuildContext context, Movie movie) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)),
    );
  }
}

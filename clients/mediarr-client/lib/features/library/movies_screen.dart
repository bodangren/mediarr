import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/movie.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/poster_card.dart';
import '../playback/playback_navigation.dart';
import 'continue_watching_section.dart';
import 'movie_detail_screen.dart';

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
    final continueWatchingAsync = ref.watch(continueWatchingProvider);

    return NetflixScaffold(
      child: Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Row(
                children: [
                  Text(
                    'Movies',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const Spacer(),
                  SizedBox(
                    width: 360,
                    child: TextField(
                      // The FocusNode must belong to the TextField itself. A
                      // wrapper Focus keeps the input method from attaching,
                      // so the field accepted no text (F5).
                      focusNode: _searchFocusNode,
                      controller: _searchController,
                      onChanged: (value) => setState(() => _searchQuery = value),
                      decoration: InputDecoration(
                        hintText: 'Search...',
                        prefixIcon: const Icon(Icons.search, size: 28),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        filled: true,
                        fillColor: MediarrColors.surfaceCard,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      style: const TextStyle(
                        color: MediarrColors.textPrimary,
                        fontSize: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            ContinueWatchingSection(
              items: continueWatchingAsync.value ?? const [],
              isLoading: continueWatchingAsync.isLoading,
              onResume: (item) => _resumeContinueWatching(context, item),
            ),
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
                  return GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 280,
                      childAspectRatio: 0.58,
                      crossAxisSpacing: 24,
                      mainAxisSpacing: 24,
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
                        onPressed: () => _openMovieDetail(context, movie),
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

  void _resumeContinueWatching(
      BuildContext context, ContinueWatchingItem item) {
    final apiClient = ref.read(apiClientProvider.notifier);
    final type = item.mediaTypeQueryValue;
    final streamUrl = apiClient.getStreamUrl(item.mediaId, type);
    final title = item.episodeTitle != null
        ? '${item.title} - ${item.episodeTitle}'
        : item.title;

    openFullscreenPlayback(
      context,
      streamUrl: streamUrl,
      title: title,
      mediaId: item.mediaId,
      mediaType: type,
    );
  }
}

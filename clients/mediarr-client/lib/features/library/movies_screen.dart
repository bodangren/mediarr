import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/movie.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/media_grid.dart';
import '../../shared/widgets/poster_card.dart';
import '../playback/playback_screen.dart';
import 'continue_watching_section.dart';
import 'movie_detail_screen.dart';

/// Provider that fetches the movie list from the API.
final moviesProvider = FutureProvider<List<Movie>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getMovies();
});

/// Movies library browsing screen.
class MoviesScreen extends ConsumerStatefulWidget {
  const MoviesScreen({super.key});

  @override
  ConsumerState<MoviesScreen> createState() => _MoviesScreenState();
}

class _MoviesScreenState extends ConsumerState<MoviesScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
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

    return moviesAsync.when(
      loading: () => const MediaGrid(
        title: 'Movies',
        itemCount: 0,
        itemBuilder: _emptyBuilder,
        isLoading: true,
      ),
      error: (error, _) => MediaGrid(
        title: 'Movies',
        itemCount: 0,
        itemBuilder: _emptyBuilder,
        isEmpty: true,
        emptyMessage: 'Failed to load movies: $error',
      ),
      data: (movies) {
        final filtered = _filterMovies(movies);
        return MediaGrid(
          title: 'Movies',
          searchController: _searchController,
          onSearchChanged: (value) => setState(() => _searchQuery = value),
          topSection: ContinueWatchingSection(
            items: continueWatchingAsync.value ?? const [],
            isLoading: continueWatchingAsync.isLoading,
            onResume: _resumeContinueWatching,
          ),
          itemCount: filtered.length,
          isEmpty: filtered.isEmpty,
          emptyMessage: _searchQuery.isEmpty
              ? 'No movies in library'
              : 'No movies match "$_searchQuery"',
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
              onPressed: () => _openMovieDetail(movie),
            );
          },
        );
      },
    );
  }

  void _openMovieDetail(Movie movie) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MovieDetailScreen(movie: movie),
      ),
    );
  }

  void _resumeContinueWatching(ContinueWatchingItem item) {
    final apiClient = ref.read(apiClientProvider.notifier);
    final type = item.mediaTypeQueryValue;
    final streamUrl = apiClient.getStreamUrl(item.mediaId, type);
    final title = item.episodeTitle != null
        ? '${item.title} - ${item.episodeTitle}'
        : item.title;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlaybackScreen(
          streamUrl: streamUrl,
          title: title,
          mediaId: item.mediaId,
          mediaType: type,
        ),
      ),
    );
  }

  static Widget _emptyBuilder(BuildContext context, int index) =>
      const SizedBox();
}

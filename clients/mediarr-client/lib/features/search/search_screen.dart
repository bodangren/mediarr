import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:mediarr_client/shared/services/api_config.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/movie.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../../shared/utils/async_value_ext.dart';
import '../library/movie_detail_screen.dart';
import '../library/poster_grid.dart';
import '../library/series_detail_screen.dart';

/// Combined movie + series search (owner mockup 2026-09-24, FR-5).
///
/// Minimal and D-pad operable: one field (autofocused, so the on-screen TV
/// keyboard opens), one results grid, Select opens the detail screen. The
/// query filters the loaded library client side; no new server endpoint.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchResult {
  const _SearchResult({
    required this.id,
    required this.title,
    required this.isMovie,
    this.year,
    this.posterUrl,
  });

  final int id;
  final String title;
  final bool isMovie;
  final int? year;
  final String? posterUrl;
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  // Bound to the TextField below: the editable owns focus and the input
  // method attaches (F5). A bare, unattached node never opens the keyboard.
  final _queryFocusNode = FocusNode(debugLabel: 'SearchScreen.query');
  final _queryController = TextEditingController();
  String _query = '';
  String _typeFilter = 'all'; // all | movie | series

  @override
  void dispose() {
    _queryFocusNode.dispose();
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _open(_SearchResult result) async {
    final client = ref.read(apiClientProvider.notifier);
    final navigator = Navigator.of(context, rootNavigator: true);
    if (result.isMovie) {
      final movie = await client.getMovie(result.id);
      if (movie != null && mounted) {
        navigator.push(
          MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)),
        );
      }
      return;
    }
    final series = await client.getSeriesById(result.id);
    if (series != null && mounted) {
      navigator.push(
        MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: series)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final moviesAsync = ref.watch(_searchMoviesProvider);
    final seriesAsync = ref.watch(_searchSeriesProvider);
    final isLoading =
        (moviesAsync.isLoading && moviesAsync.dataOrNull == null) ||
        (seriesAsync.isLoading && seriesAsync.dataOrNull == null);
    final error = moviesAsync.error ?? seriesAsync.error;
    final allResults =
        _filter(moviesAsync.dataOrNull, seriesAsync.dataOrNull);
    final results = _typeFilter == 'all'
        ? allResults
        : allResults
            .where((r) => _typeFilter == 'movie' ? r.isMovie : !r.isMovie)
            .toList();
    final movieCount = allResults.where((r) => r.isMovie).length;
    final seriesCount = allResults.length - movieCount;

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Text(
                'Search',
                style: TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: SizedBox(
                width: 560,
                child: TextField(
                  focusNode: _queryFocusNode,
                  controller: _queryController,
                  autofocus: true,
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 20,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Search movies and series',
                    hintStyle: const TextStyle(color: MediarrColors.textMuted),
                    prefixIcon: const Icon(Icons.search,
                        color: MediarrColors.textSecondary),
                    filled: true,
                    fillColor: MediarrColors.surfaceCard,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: MediarrColors.borderSubtle),
                    ),
                  ),
                  onChanged: (value) => setState(() => _query = value),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All · ${allResults.length}',
                    selected: _typeFilter == 'all',
                    onSelect: () => setState(() => _typeFilter = 'all'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Movies · $movieCount',
                    selected: _typeFilter == 'movie',
                    onSelect: () => setState(() => _typeFilter = 'movie'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Series · $seriesCount',
                    selected: _typeFilter == 'series',
                    onSelect: () => setState(() => _typeFilter = 'series'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                          color: MediarrColors.accentPrimary),
                    )
                  : error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                'Search failed to load the library.',
                                style: TextStyle(
                                    color: MediarrColors.textMuted,
                                    fontSize: 18),
                              ),
                              const SizedBox(height: 16),
                              FocusableAction(
                                autofocus: true,
                                onSelect: () {
                                  ref.invalidate(_searchMoviesProvider);
                                  ref.invalidate(_searchSeriesProvider);
                                },
                                borderRadius: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: MediarrColors.surfaceCard,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                        color: MediarrColors.borderSubtle),
                                  ),
                                  child: const Text('Retry',
                                      style: TextStyle(
                                          color: MediarrColors.textPrimary,
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600)),
                                ),
                              ),
                            ],
                          ),
                        )
                      : _query.trim().isEmpty
                          ? const Center(
                              child: Text(
                                'Type to search movies and series',
                                style: TextStyle(
                                    color: MediarrColors.textMuted,
                                    fontSize: 20),
                              ),
                            )
                          : results.isEmpty
                              ? Center(
                                  child: Text(
                                    'No matches for "${_query.trim()}"',
                                    style: const TextStyle(
                                        color: MediarrColors.textMuted,
                                        fontSize: 18),
                                  ),
                                )
                              : LayoutBuilder(
                builder: (context, constraints) {
                  final horizontalPadding =
                      constraints.maxWidth > 900 ? 24.0 : 16.0;
                  return GridView.builder(
                    padding: EdgeInsets.fromLTRB(
                        horizontalPadding, 12, horizontalPadding, 24),
                    // FR-1: the shared density contract, so search results
                    // match the library grids.
                    gridDelegate: posterGridDelegateFor(
                        constraints.maxWidth - horizontalPadding * 2),
                    itemCount: results.length,
                    itemBuilder: (context, index) {
                      final result = results[index];
                      return FocusableAction(
                        onSelect: () => _open(result),
                        borderRadius: 8,
                        child: _ResultCard(result: result),
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

  List<_SearchResult> _filter(List<Movie>? movies, List<Series>? series) {
    final query = _query.trim().toLowerCase();
    final results = <_SearchResult>[
      for (final movie in movies ?? const <Movie>[])
        _SearchResult(
          id: movie.id,
          title: movie.title,
          isMovie: true,
          year: movie.year,
          posterUrl: movie.posterUrl,
        ),
      for (final s in series ?? const <Series>[])
        _SearchResult(
          id: s.id,
          title: s.title,
          isMovie: false,
          year: s.year,
          posterUrl: s.posterUrl,
        ),
    ];
    if (query.isEmpty) return results;
    return results
        .where((r) => r.title.toLowerCase().contains(query))
        .toList();
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onSelect});

  final String label;
  final bool selected;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      onSelect: onSelect,
      borderRadius: 20,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? MediarrColors.accentPrimary : MediarrColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: MediarrColors.borderSubtle),
        ),
        child: Text(label,
            style: const TextStyle(
                color: MediarrColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});

  final _SearchResult result;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: result.posterUrl != null
              ? CachedNetworkImage(
                  imageUrl: ApiConfig.image(result.posterUrl!),
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(color: MediarrColors.surfaceCard),
                  errorWidget: (_, __, ___) =>
                      Container(color: MediarrColors.surfaceCard),
                )
              : Container(color: MediarrColors.surfaceCard),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Text(
            result.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

final _searchMoviesProvider = FutureProvider<List<Movie>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getMovies();
});

final _searchSeriesProvider = FutureProvider<List<Series>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getSeries();
});

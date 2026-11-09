import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:mediarr_client/shared/services/api_config.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/library_search_item.dart';
import '../../shared/services/api_client.dart';
import '../library/movie_detail_screen.dart';
import '../library/poster_grid.dart';
import '../library/series_detail_screen.dart';

/// Combined movie + series + episode search backed by `GET /api/library/search`.
///
/// Server-side and debounced (Kimi home/search review): typing sends a cancellable query instead of
/// filtering two whole libraries locally, results are typed with counts, and episodes can be opened.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _queryFocusNode = FocusNode(debugLabel: 'SearchScreen.query');
  final _queryController = TextEditingController();
  Timer? _debounce;
  int _requestSeq = 0;
  String _query = '';
  String _typeFilter = 'all'; // all | movie | series | episode
  List<LibrarySearchItem> _results = const [];
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _debounce?.cancel();
    _queryFocusNode.dispose();
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _runSearch() async {
    final term = _query.trim();
    final seq = ++_requestSeq;
    if (term.isEmpty) {
      setState(() {
        _results = const [];
        _loading = false;
        _error = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await ref
          .read(apiClientProvider.notifier)
          .searchLibrary(query: term, limit: 50);
      if (!mounted || seq != _requestSeq) return; // a newer keystroke won
      setState(() {
        _results = items;
        _loading = false;
      });
    } catch (error) {
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _error = 'Search failed: $error';
        _loading = false;
      });
    }
  }

  void _onQueryChanged(String value) {
    setState(() {
      _query = value;
      if (value.trim().isEmpty) _results = const [];
    });
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () {
      if (mounted) unawaited(_runSearch());
    });
  }

  Future<void> _open(LibrarySearchItem result) async {
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
    final seriesId = result.isEpisode ? result.seriesId : result.id;
    if (seriesId == null) return;
    final series = await client.getSeriesById(seriesId);
    if (series != null && mounted) {
      navigator.push(
        MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: series)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final movieCount = _results.where((r) => r.isMovie).length;
    final seriesCount = _results.where((r) => r.isSeries).length;
    final episodeCount = _results.where((r) => r.isEpisode).length;
    final visible = _typeFilter == 'all'
        ? _results
        : _results.where((r) => r.type == _typeFilter).toList();

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
                    hintText: 'Search movies, series and episodes',
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
                  onChanged: _onQueryChanged,
                  onSubmitted: (_) => unawaited(_runSearch()),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All · ${_results.length}',
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
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Episodes · $episodeCount',
                    selected: _typeFilter == 'episode',
                    onSelect: () => setState(() => _typeFilter = 'episode'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading && _results.isEmpty
                  ? const Center(
                      child: CircularProgressIndicator(
                          color: MediarrColors.accentPrimary),
                    )
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _error!,
                                style: const TextStyle(
                                    color: MediarrColors.textMuted,
                                    fontSize: 18),
                              ),
                              const SizedBox(height: 16),
                              FocusableAction(
                                autofocus: true,
                                onSelect: () => unawaited(_runSearch()),
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
                                'Type to search movies, series and episodes',
                                style: TextStyle(
                                    color: MediarrColors.textMuted,
                                    fontSize: 20),
                              ),
                            )
                          : visible.isEmpty
                              ? Center(
                                  child: Text(
                                    _loading
                                        ? 'Searching…'
                                        : 'No matches for "${_query.trim()}"',
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
                                      gridDelegate: posterGridDelegateFor(
                                          constraints.maxWidth -
                                              horizontalPadding * 2),
                                      itemCount: visible.length,
                                      itemBuilder: (context, index) {
                                        final result = visible[index];
                                        return FocusableAction(
                                          autofocus: index == 0 && !_queryFocusNode.hasFocus,
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

  final LibrarySearchItem result;

  String get _context {
    if (result.isEpisode) {
      final series = result.subtitle == null ? '' : '${result.subtitle} · ';
      return '$series${result.episodeLabel}';
    }
    if (result.isSeries) return result.year == null ? 'TV series' : 'TV series · ${result.year}';
    return result.year == null ? 'Movie' : 'Movie · ${result.year}';
  }

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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                result.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                _context,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: MediarrColors.textMuted, fontSize: 14),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

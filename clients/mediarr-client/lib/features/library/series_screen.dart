import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/poster_card.dart';
import 'poster_grid.dart';
import 'series_detail_screen.dart';

/// Provider that fetches the series list from the API.
final seriesListProvider = FutureProvider<List<Series>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getSeries();
});

/// TV Series library browsing screen — dense poster grid, D-pad navigable.
class SeriesScreen extends ConsumerStatefulWidget {
  const SeriesScreen({super.key});

  @override
  ConsumerState<SeriesScreen> createState() => _SeriesScreenState();
}

class _SeriesScreenState extends ConsumerState<SeriesScreen> {
  final _searchController = TextEditingController();
  final FocusNode _searchFocusNode =
      FocusNode(debugLabel: 'SeriesScreen.search');
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  List<Series> _filterSeries(List<Series> series) {
    if (_searchQuery.isEmpty) return series;
    final query = _searchQuery.toLowerCase();
    return series
        .where((s) => s.title.toLowerCase().contains(query))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final seriesAsync = ref.watch(seriesListProvider);

    return NetflixScaffold(
      child: Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // FR-1: compact header, matching MoviesScreen, so the grid keeps
            // the height that two complete poster rows need.
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: Row(
                children: [
                  Text(
                    'Series',
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
            // FR-1: Continue Watching removed here for the same reason as on
            // MoviesScreen. It stays on Home.
            Expanded(
              child: seriesAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(
                      color: MediarrColors.accentPrimary),
                ),
                error: (error, _) => Center(
                  child: Text(
                    'Failed to load series: $error',
                    style: const TextStyle(color: MediarrColors.textMuted),
                  ),
                ),
                data: (series) {
                  final filtered = _filterSeries(series);
                  if (filtered.isEmpty) {
                    return Center(
                      child: Text(
                        _searchQuery.isEmpty
                            ? 'No series in library'
                            : 'No series match "$_searchQuery"',
                        style: const TextStyle(
                          color: MediarrColors.textMuted,
                          fontSize: 16,
                        ),
                      ),
                    );
                  }
                  // FR-1: the shared density contract, 6 columns and 2
                  // complete rows at the TV viewport.
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
                          final s = filtered[index];
                          return PosterCard(
                            title: s.title,
                            posterUrl: s.posterUrl,
                            year: s.year,
                            monitored: s.monitored,
                            hasFile: (s.episodeFileCount ?? 0) > 0,
                            autofocus: index == 0,
                            onPressed: () => _openSeriesDetail(context, s),
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

  void _openSeriesDetail(BuildContext context, Series series) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: series)),
    );
  }
}

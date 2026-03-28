import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/media_grid.dart';
import '../../shared/widgets/poster_card.dart';
import 'series_detail_screen.dart';

/// Provider that fetches the series list from the API.
final seriesListProvider = FutureProvider<List<Series>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getSeries();
});

/// TV Series library browsing screen.
class SeriesScreen extends ConsumerStatefulWidget {
  const SeriesScreen({super.key});

  @override
  ConsumerState<SeriesScreen> createState() => _SeriesScreenState();
}

class _SeriesScreenState extends ConsumerState<SeriesScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
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

    return seriesAsync.when(
      loading: () => const MediaGrid(
        title: 'Series',
        itemCount: 0,
        itemBuilder: _emptyBuilder,
        isLoading: true,
      ),
      error: (error, _) => MediaGrid(
        title: 'Series',
        itemCount: 0,
        itemBuilder: _emptyBuilder,
        isEmpty: true,
        emptyMessage: 'Failed to load series: $error',
      ),
      data: (series) {
        final filtered = _filterSeries(series);
        return MediaGrid(
          title: 'Series',
          searchController: _searchController,
          onSearchChanged: (value) => setState(() => _searchQuery = value),
          itemCount: filtered.length,
          isEmpty: filtered.isEmpty,
          emptyMessage: _searchQuery.isEmpty
              ? 'No series in library'
              : 'No series match "$_searchQuery"',
          itemBuilder: (context, index) {
            final s = filtered[index];
            return PosterCard(
              title: s.title,
              posterUrl: s.posterUrl,
              year: s.year,
              monitored: s.monitored,
              hasFile: (s.episodeFileCount ?? 0) > 0,
              autofocus: index == 0,
              onPressed: () => _openSeriesDetail(s),
            );
          },
        );
      },
    );
  }

  void _openSeriesDetail(Series series) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SeriesDetailScreen(series: series),
      ),
    );
  }

  static Widget _emptyBuilder(BuildContext context, int index) =>
      const SizedBox();
}

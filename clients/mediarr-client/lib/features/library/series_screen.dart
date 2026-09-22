import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/poster_card.dart';
import '../playback/playback_screen.dart';
import 'continue_watching_section.dart';
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
                    'Series',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const Spacer(),
                  SizedBox(
                    width: 280,
                    child: Focus(
                      focusNode: _searchFocusNode,
                      child: TextField(
                        controller: _searchController,
                        onChanged: (value) =>
                            setState(() => _searchQuery = value),
                        decoration: InputDecoration(
                          hintText: 'Search...',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          filled: true,
                          fillColor: MediarrColors.surfaceCard,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          isDense: true,
                        ),
                        style: const TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 14,
                        ),
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
                  return GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 180,
                      childAspectRatio: 0.6,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
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

  void _resumeContinueWatching(
      BuildContext context, ContinueWatchingItem item) {
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
}

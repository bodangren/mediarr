import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../core/widgets/tv_context_menu.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/poster_card.dart';
import 'continue_watching_section.dart';
import 'library_view_chip.dart';
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
  final FocusNode _searchFocusNode = FocusNode(
    debugLabel: 'SeriesScreen.search',
  );
  String _searchQuery = '';

  /// Whether a poster currently holds focus (drives the Up hop into the
  /// header, as on MoviesScreen).
  bool _gridFocused = false;

  /// FR-4: Up from the grid enters the header search field.
  ///
  /// Left to geometry, Up from the first poster can land on the rail; while
  /// the field itself is focused, Up must not walk out of the header, because
  /// the field is the top stop of this screen.

  /// First focusable grid node, so leaving the search field always lands on a
  /// visible control (FR-3/FR-4).
  FocusNode? _firstGridNode() {
    for (final node in _seriesFocusNodes.values) {
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
      final first = _firstGridNode();
      first?.requestFocus();
      return KeyEventResult.handled;
    }

    if (event.logicalKey != LogicalKeyboardKey.arrowUp) {
      return KeyEventResult.ignored;
    }
    if (_searchFocusNode.hasFocus) return KeyEventResult.handled;
    if (!_gridFocused) return KeyEventResult.ignored;
    _searchFocusNode.requestFocus();
    return KeyEventResult.handled;
  }

  /// Sort/filter state for the library (Kimi series review: filters/sort and
  /// deterministic order). Applied client-side to the already-loaded list.
  String _sortBy = 'title'; // title | year | watched
  bool _sortAsc = true;
  String _filter = 'all'; // all | monitored | unwatched | missing | continuing

  /// One focus node per poster, so Back from a series detail returns to the
  /// poster that opened it.
  final Map<int, FocusNode> _seriesFocusNodes = {};

  FocusNode _nodeFor(Series series) => _seriesFocusNodes.putIfAbsent(
    series.id,
    () => FocusNode(debugLabel: 'SeriesScreen.series.${series.id}'),
  );

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    for (final node in _seriesFocusNodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  List<Series> _filterSeries(List<Series> series) {
    var result = series;
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      result = result
          .where((s) => s.title.toLowerCase().contains(query))
          .toList();
    }
    result = switch (_filter) {
      'monitored' => result.where((s) => s.monitored).toList(),
      'unwatched' =>
        result
            .where((s) => (s.watchedEpisodeCount ?? 0) < (s.episodeCount ?? 0))
            .toList(),
      'missing' =>
        result
            .where((s) => (s.episodeFileCount ?? 0) < (s.episodeCount ?? 0))
            .toList(),
      'continuing' =>
        result
            .where((s) => (s.status ?? '').toLowerCase() == 'continuing')
            .toList(),
      _ => result,
    };
    final sorted = [...result];
    sorted.sort((a, b) {
      final by = switch (_sortBy) {
        'year' => (a.year ?? 0).compareTo(b.year ?? 0),
        'watched' => (a.watchedEpisodeCount ?? 0).compareTo(
          b.watchedEpisodeCount ?? 0,
        ),
        _ => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
      };
      return _sortAsc ? by : -by;
    });
    return sorted;
  }

  bool get _hasActiveView =>
      _searchQuery.isNotEmpty ||
      _filter != 'all' ||
      _sortBy != 'title' ||
      !_sortAsc;

  @override
  Widget build(BuildContext context) {
    final seriesAsync = ref.watch(seriesListProvider);

    return NetflixScaffold(
      child: Scaffold(
        backgroundColor: MediarrColors.surfaceBase,
        body: Focus(
          canRequestFocus: false,
          skipTraversal: true,
          onKeyEvent: _handleKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // FR-1: compact header, matching MoviesScreen, so the grid
              // keeps the height that two complete poster rows need.
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
                            'Series',
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
                            // The FocusNode must belong to the TextField
                            // itself: a wrapper Focus keeps the input method
                            // from attaching (F5).
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
              // FR-1: Continue Watching removed here for the same reason as on
              // MoviesScreen. It stays on Home.
              Expanded(
                child: seriesAsync.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(
                      color: MediarrColors.accentPrimary,
                    ),
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
                            fontSize: 18,
                          ),
                        ),
                      );
                    }
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_hasActiveView)
                          _SeriesViewChips(
                            search: _searchQuery,
                            sortLabel: switch ((_sortBy, _sortAsc)) {
                              ('title', true) => null,
                              ('year', false) => 'Year (newest)',
                              ('watched', false) => 'Most watched',
                              _ => '$_sortBy ${_sortAsc ? 'asc' : 'desc'}',
                            },
                            filterLabel: switch (_filter) {
                              'monitored' => 'Monitored',
                              'unwatched' => 'Unwatched',
                              'missing' => 'Missing episodes',
                              'continuing' => 'Continuing',
                              _ => null,
                            },
                            onClearSearch: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            onClearSort: () => setState(() {
                              _sortBy = 'title';
                              _sortAsc = true;
                            }),
                            onClearFilter: () =>
                                setState(() => _filter = 'all'),
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
                                  final s = filtered[index];
                                  return PosterCard(
                                    focusNode: _nodeFor(s),
                                    title: s.title,
                                    posterUrl: s.posterUrl,
                                    year: s.year,
                                    monitored: s.monitored,
                                    hasFile: (s.episodeFileCount ?? 0) > 0,
                                    autofocus: index == 0,
                                    onFocusChange: (focused) =>
                                        _gridFocused = focused,
                                    onPressed: () => unawaited(
                                      _openSeriesDetail(context, s),
                                    ),
                                    onContextMenu: () => _openSeriesMenu(s),
                                    watchedCount: s.watchedEpisodeCount,
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

  void _showViewMenu(BuildContext context) {
    showTvContextMenu(
      context,
      title: 'Sort & filter',
      actions: [
        TvContextAction(
          label: _sortBy == 'title' && _sortAsc ? '✓ Title A–Z' : 'Title A–Z',
          onSelected: () => setState(() {
            _sortBy = 'title';
            _sortAsc = true;
          }),
        ),
        TvContextAction(
          label: _sortBy == 'year' && !_sortAsc
              ? '✓ Year (newest)'
              : 'Year (newest)',
          onSelected: () => setState(() {
            _sortBy = 'year';
            _sortAsc = false;
          }),
        ),
        TvContextAction(
          label: _sortBy == 'watched' && !_sortAsc
              ? '✓ Most watched'
              : 'Most watched',
          onSelected: () => setState(() {
            _sortBy = 'watched';
            _sortAsc = false;
          }),
        ),
        TvContextAction(
          label: _filter == 'all' ? '✓ All series' : 'All series',
          onSelected: () => setState(() => _filter = 'all'),
        ),
        TvContextAction(
          label: _filter == 'monitored' ? '✓ Monitored' : 'Monitored',
          onSelected: () => setState(() => _filter = 'monitored'),
        ),
        TvContextAction(
          label: _filter == 'unwatched' ? '✓ Unwatched' : 'Unwatched',
          onSelected: () => setState(() => _filter = 'unwatched'),
        ),
        TvContextAction(
          label: _filter == 'missing'
              ? '✓ Missing episodes'
              : 'Missing episodes',
          onSelected: () => setState(() => _filter = 'missing'),
        ),
        TvContextAction(
          label: _filter == 'continuing' ? '✓ Continuing' : 'Continuing',
          onSelected: () => setState(() => _filter = 'continuing'),
        ),
      ],
    );
  }

  void _openSeriesMenu(Series series) {
    showTvContextMenu(
      context,
      title: series.title,
      actions: [
        TvContextAction(
          label: 'Open series',
          onSelected: () => _openSeriesDetail(context, series),
        ),
        TvContextAction(
          label: 'Mark watched',
          onSelected: () => _setSeriesWatched(series, true),
        ),
        TvContextAction(
          label: 'Mark unwatched',
          onSelected: () => _setSeriesWatched(series, false),
        ),
      ],
    );
  }

  Future<void> _setSeriesWatched(Series series, bool watched) async {
    try {
      await ref
          .read(apiClientProvider.notifier)
          .setSeriesWatched(seriesId: series.id, watched: watched);
      ref.invalidate(seriesListProvider);
    } catch (_) {
      // A failed bulk update keeps the previous list state rather than taking the screen down.
    }
  }

  Future<void> _openSeriesDetail(BuildContext context, Series series) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: series)),
    );
    if (!mounted) return;
    // The detail screen can mark episodes/seasons watched and playback writes
    // new resume points, so both the library row and Continue Watching would
    // otherwise be stale on return (Kimi series review).
    ref.invalidate(seriesListProvider);
    ref.invalidate(continueWatchingProvider);
    _seriesFocusNodes[series.id]?.requestFocus();
  }
}

/// Compact strip of the active series search/sort/filter; each chip clears its
/// own facet. Mounts only when the view is narrowed, so the poster grid keeps
/// its two complete rows at the TV viewport.
class _SeriesViewChips extends StatelessWidget {
  const _SeriesViewChips({
    required this.search,
    required this.sortLabel,
    required this.filterLabel,
    required this.onClearSearch,
    required this.onClearSort,
    required this.onClearFilter,
  });

  final String search;
  final String? sortLabel;
  final String? filterLabel;
  final VoidCallback onClearSearch;
  final VoidCallback onClearSort;
  final VoidCallback onClearFilter;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 8),
      child: Row(
        children: [
          if (search.isNotEmpty) ...[
            LibraryViewChip(label: '"$search"', onSelect: onClearSearch),
            const SizedBox(width: 8),
          ],
          if (sortLabel != null) ...[
            LibraryViewChip(label: sortLabel!, onSelect: onClearSort),
            const SizedBox(width: 8),
          ],
          if (filterLabel != null)
            LibraryViewChip(label: filterLabel!, onSelect: onClearFilter),
        ],
      ),
    );
  }
}

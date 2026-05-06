import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/mediarr_theme.dart';
import '../../shared/models/library_item.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/library_item_card.dart';
import '../../shared/widgets/media_grid.dart';
import '../library/movie_detail_screen.dart';
import '../library/series_detail_screen.dart';

/// Sort options for the library grid.
enum LibrarySort {
  titleAsc('Title (A–Z)'),
  titleDesc('Title (Z–A)'),
  yearDesc('Year (newest)'),
  yearAsc('Year (oldest)'),
  addedDesc('Recently added');

  const LibrarySort(this.label);
  final String label;

  String get sortBy {
    switch (this) {
      case LibrarySort.titleAsc:
      case LibrarySort.titleDesc:
        return 'title';
      case LibrarySort.yearDesc:
      case LibrarySort.yearAsc:
        return 'year';
      case LibrarySort.addedDesc:
        return 'added';
    }
  }

  String get sortDir {
    switch (this) {
      case LibrarySort.titleAsc:
      case LibrarySort.yearAsc:
        return 'asc';
      case LibrarySort.titleDesc:
      case LibrarySort.yearDesc:
      case LibrarySort.addedDesc:
        return 'desc';
    }
  }
}

/// Current library query parameters.
class LibraryQuery {
  const LibraryQuery({
    this.type,
    this.sort = LibrarySort.titleAsc,
    this.page = 1,
    this.pageSize = 50,
  });

  final String? type; // 'movie' or 'series'
  final LibrarySort sort;
  final int page;
  final int pageSize;

  LibraryQuery copyWith({
    String? type,
    LibrarySort? sort,
    int? page,
    int? pageSize,
  }) {
    return LibraryQuery(
      type: type ?? this.type,
      sort: sort ?? this.sort,
      page: page ?? this.page,
      pageSize: pageSize ?? this.pageSize,
    );
  }
}

/// Provider that fetches paginated library items.
final libraryProvider = FutureProvider.family<
    ({List<LibraryItem> items, int totalCount, int totalPages}),
    LibraryQuery>((ref, query) async {
  final client = ref.read(apiClientProvider.notifier);
  final result = await client.getLibrary(
    type: query.type,
    sortBy: query.sort.sortBy,
    sortDir: query.sort.sortDir,
    page: query.page,
    pageSize: query.pageSize,
  );
  return (
    items: result.items,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
  );
});

/// A unified library browsing screen with Movies / TV Shows tabs,
/// sort controls, and pull-to-refresh.
class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  LibraryQuery _query = const LibraryQuery();
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      setState(() {
        _selectedTab = _tabController.index;
        _query = _query.copyWith(
          type: _tabController.index == 0 ? 'movie' : 'series',
          page: 1,
        );
      });
    }
  }

  Future<void> _refresh() async {
    ref.invalidate(libraryProvider(_query));
    await ref.read(libraryProvider(_query).future);
  }

  void _onSortChanged(LibrarySort? sort) {
    if (sort == null) return;
    setState(() {
      _query = _query.copyWith(sort: sort, page: 1);
    });
  }

  Future<void> _openDetail(LibraryItem item) async {
    final client = ref.read(apiClientProvider.notifier);

    if (item.type == 'movie') {
      final movie = await client.getMovie(item.id);
      if (movie != null && mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => MovieDetailScreen(movie: movie),
          ),
        );
      }
    } else {
      final series = await client.getSeriesById(item.id);
      if (series != null && mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => SeriesDetailScreen(series: series),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final libraryAsync = ref.watch(libraryProvider(_query));

    return Scaffold(
      backgroundColor: MediarrColors.surfaceBase,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with tabs and sort
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
            child: Row(
              children: [
                Expanded(
                  child: TabBar(
                    controller: _tabController,
                    isScrollable: true,
                    labelColor: MediarrColors.accentPrimary,
                    unselectedLabelColor: MediarrColors.textMuted,
                    indicatorColor: MediarrColors.accentPrimary,
                    tabs: const [
                      Tab(text: 'Movies'),
                      Tab(text: 'TV Shows'),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                _SortDropdown(
                  value: _query.sort,
                  onChanged: _onSortChanged,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Content
          Expanded(
            child: libraryAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(
                  color: MediarrColors.accentPrimary,
                ),
              ),
              error: (error, _) => Center(
                child: Text(
                  'Failed to load library: $error',
                  style: const TextStyle(color: MediarrColors.textMuted),
                ),
              ),
              data: (result) {
                if (result.items.isEmpty) {
                  return _EmptyLibrary(
                    onAddMedia: () => context.go(AppRoutes.search),
                  );
                }

                return RefreshIndicator(
                  onRefresh: _refresh,
                  color: MediarrColors.accentPrimary,
                  backgroundColor: MediarrColors.surfaceCard,
                  child: GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 200,
                      childAspectRatio: 0.6,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: result.items.length,
                    itemBuilder: (context, index) {
                      final item = result.items[index];
                      return LibraryItemCard(
                        item: item,
                        autofocus: index == 0,
                        onTap: () => _openDetail(item),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SortDropdown extends StatelessWidget {
  const _SortDropdown({
    required this.value,
    required this.onChanged,
  });

  final LibrarySort value;
  final ValueChanged<LibrarySort?> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButton<LibrarySort>(
      value: value,
      dropdownColor: MediarrColors.surfaceCard,
      style: const TextStyle(color: MediarrColors.textPrimary, fontSize: 14),
      icon: const Icon(Icons.sort, color: MediarrColors.textMuted, size: 18),
      underline: const SizedBox(),
      onChanged: onChanged,
      items: LibrarySort.values.map((sort) {
        return DropdownMenuItem<LibrarySort>(
          value: sort,
          child: Text(sort.label),
        );
      }).toList(),
    );
  }
}

class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary({required this.onAddMedia});

  final VoidCallback onAddMedia;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.movie_outlined,
            color: MediarrColors.textMuted,
            size: 64,
          ),
          const SizedBox(height: 16),
          const Text(
            'Your library is empty',
            style: TextStyle(
              color: MediarrColors.textMuted,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Add movies and TV shows to get started',
            style: TextStyle(
              color: MediarrColors.textMuted,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: onAddMedia,
            icon: const Icon(Icons.search),
            label: const Text('Add Media'),
            style: ElevatedButton.styleFrom(
              backgroundColor: MediarrColors.accentPrimary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}

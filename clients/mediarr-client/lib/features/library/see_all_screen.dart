import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/library_item.dart';
import '../../shared/services/api_client.dart';
import '../../shared/utils/async_value_ext.dart';
import 'movie_detail_screen.dart';
import 'series_detail_screen.dart';

/// Provider for the full "Recently Added" list behind `See All >` (FR-4).
final seeAllItemsProvider = FutureProvider<List<LibraryItem>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  final result = await client.getLibrary(
    sortBy: 'added',
    sortDir: 'desc',
    pageSize: 100,
  );
  return result.items;
});

/// Grid screen behind a row's `See All >` action (owner mockup 2026-09-24).
///
/// Select opens the matching detail screen. Layout matches the library grids.
class SeeAllScreen extends ConsumerWidget {
  const SeeAllScreen({super.key, required this.title});

  final String title;

  Future<void> _open(
      BuildContext context, WidgetRef ref, LibraryItem item) async {
    final client = ref.read(apiClientProvider.notifier);
    final navigator = Navigator.of(context, rootNavigator: true);
    if (item.type == 'movie') {
      final movie = await client.getMovie(item.id);
      if (movie != null && context.mounted) {
        navigator.push(
          MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)),
        );
      }
    } else if (item.type == 'series') {
      final series = await client.getSeriesById(item.id);
      if (series != null && context.mounted) {
        navigator.push(
          MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: series)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemsAsync = ref.watch(seeAllItemsProvider);
    final items = itemsAsync.dataOrNull ?? const <LibraryItem>[];

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Text(
                title,
                style: const TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Expanded(
              child: itemsAsync.isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: MediarrColors.accentPrimary,
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(24),
                      gridDelegate:
                          const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 220,
                        childAspectRatio: 0.62,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final item = items[index];
                        return FocusableAction(
                          onSelect: () => _open(context, ref, item),
                          borderRadius: 8,
                          child: _SeeAllCard(item: item),
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

class _SeeAllCard extends StatelessWidget {
  const _SeeAllCard({required this.item});

  final LibraryItem item;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: item.posterUrl != null
              ? CachedNetworkImage(
                  imageUrl: item.posterUrl!,
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
            item.title,
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

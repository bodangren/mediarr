import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/collection.dart';
import '../../shared/services/api_client.dart';
import '../../shared/utils/async_value_ext.dart';
import 'movie_detail_screen.dart';
import 'poster_grid.dart';

/// Movie collections (FR-4).
///
/// The server and the web UI already manage collections
/// (`GET /api/collections`); this screen is the TV client reading them.
final collectionsProvider = FutureProvider<List<MediaCollection>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getCollections();
});

/// The movies of one collection (FR-4).
final collectionMoviesProvider =
    FutureProvider.family<List<CollectionMovie>, int>((ref, collectionId) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getCollectionMovies(collectionId);
});

/// Grid of collections. Select opens [CollectionDetailScreen].
class CollectionsScreen extends ConsumerWidget {
  const CollectionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final collectionsAsync = ref.watch(collectionsProvider);
    final collections = collectionsAsync.dataOrNull ?? const <MediaCollection>[];

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: Row(
                children: [
                  const Text(
                    'Collections',
                    style: TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  FocusableAction(
                    // No autofocus here: entry focus belongs to the first
                    // tile, the same rule the library grids use. Two autofocus
                    // candidates on one screen made entry focus a race.
                    variant: FocusableActionVariant.button,
                    borderRadius: 8,
                    onSelect: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: MediarrColors.surfaceCard,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: MediarrColors.borderSubtle),
                      ),
                      child: const Text(
                        'Back',
                        style: TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: collectionsAsync.isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: MediarrColors.accentPrimary,
                      ),
                    )
                  : collections.isEmpty
                      ? const _CollectionsEmptyState()
                      : LayoutBuilder(
                          builder: (context, constraints) {
                            final padding =
                                constraints.maxWidth > 900 ? 24.0 : 16.0;
                            return GridView.builder(
                              padding: EdgeInsets.fromLTRB(
                                  padding, 0, padding, 8),
                              // FR-1 density, so collections match the library.
                              gridDelegate: posterGridDelegateFor(
                                  constraints.maxWidth - padding * 2),
                              itemCount: collections.length,
                              itemBuilder: (context, index) {
                                final collection = collections[index];
                                return FocusableAction(
                                  autofocus: index == 0,
                                  borderRadius: 8,
                                  onSelect: () => Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => CollectionDetailScreen(
                                        collection: collection,
                                      ),
                                    ),
                                  ),
                                  child: CollectionCard(
                                      collection: collection),
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

/// One collection tile: poster, name, and how much of it is watchable.
class CollectionCard extends StatelessWidget {
  const CollectionCard({super.key, required this.collection});

  final MediaCollection collection;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: collection.posterUrl != null
              ? CachedNetworkImage(
                  imageUrl: collection.posterUrl!,
                  fit: BoxFit.cover,
                  placeholder: (_, __) =>
                      Container(color: MediarrColors.surfaceCard),
                  errorWidget: (_, __, ___) =>
                      Container(color: MediarrColors.surfaceCard),
                )
              : Container(color: MediarrColors.surfaceCard),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          color: MediarrColors.surfaceElevated,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                collection.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${collection.moviesInLibrary} of ${collection.movieCount} '
                'in library',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: MediarrColors.textMuted,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CollectionsEmptyState extends StatelessWidget {
  const _CollectionsEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'No collections yet',
            style: TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 20,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Add a collection in the web UI, then it appears here.',
            style: TextStyle(
              color: MediarrColors.textMuted,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

/// The movies of one collection. Select opens the movie detail screen.
class CollectionDetailScreen extends ConsumerWidget {
  const CollectionDetailScreen({super.key, required this.collection});

  final MediaCollection collection;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final moviesAsync = ref.watch(collectionMoviesProvider(collection.id));
    final movies = moviesAsync.dataOrNull ?? const <CollectionMovie>[];

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      collection.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: MediarrColors.textPrimary,
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  FocusableAction(
                    // Entry focus belongs to the first movie tile, not here.
                    variant: FocusableActionVariant.button,
                    borderRadius: 8,
                    onSelect: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: MediarrColors.surfaceCard,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: MediarrColors.borderSubtle),
                      ),
                      child: const Text(
                        'Back',
                        style: TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: moviesAsync.isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: MediarrColors.accentPrimary,
                      ),
                    )
                  : movies.isEmpty
                      ? const Center(
                          child: Text(
                            'This collection has no movies',
                            style: TextStyle(
                              color: MediarrColors.textMuted,
                              fontSize: 16,
                            ),
                          ),
                        )
                      : LayoutBuilder(
                          builder: (context, constraints) {
                            final padding =
                                constraints.maxWidth > 900 ? 24.0 : 16.0;
                            return GridView.builder(
                              padding: EdgeInsets.fromLTRB(
                                  padding, 0, padding, 8),
                              gridDelegate: posterGridDelegateFor(
                                  constraints.maxWidth - padding * 2),
                              itemCount: movies.length,
                              itemBuilder: (context, index) {
                                final movie = movies[index];
                                return FocusableAction(
                                  autofocus: index == 0,
                                  borderRadius: 8,
                                  onSelect: () async {
                                    final client =
                                        ref.read(apiClientProvider.notifier);
                                    final full =
                                        await client.getMovie(movie.id);
                                    if (full == null || !context.mounted) return;
                                    await Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) =>
                                            MovieDetailScreen(movie: full),
                                      ),
                                    );
                                  },
                                  child: _CollectionMovieCard(movie: movie),
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

class _CollectionMovieCard extends StatelessWidget {
  const _CollectionMovieCard({required this.movie});

  final CollectionMovie movie;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: movie.posterUrl != null
              ? CachedNetworkImage(
                  imageUrl: movie.posterUrl!,
                  fit: BoxFit.cover,
                  placeholder: (_, __) =>
                      Container(color: MediarrColors.surfaceCard),
                  errorWidget: (_, __, ___) =>
                      Container(color: MediarrColors.surfaceCard),
                )
              : Container(color: MediarrColors.surfaceCard),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          color: MediarrColors.surfaceElevated,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                movie.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                movie.inLibrary
                    ? '${movie.year ?? ''}'
                    : 'Not in library',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: movie.inLibrary
                      ? MediarrColors.textMuted
                      : MediarrColors.statusWarning,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
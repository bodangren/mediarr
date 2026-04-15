import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/models/search_result.dart';
import '../../shared/services/api_client.dart';

final releasesProvider = FutureProvider.family<List<Release>, SearchResult>((ref, result) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.searchReleases(
    query: result.title,
    type: result.mediaType,
    tmdbId: result.tmdbId > 0 ? result.tmdbId : null,
    tvdbId: result.tvdbId > 0 ? result.tvdbId : null,
    year: result.year,
  );
});

class SearchResultDetailSheet extends ConsumerStatefulWidget {
  const SearchResultDetailSheet({super.key, required this.result});

  final SearchResult result;

  @override
  ConsumerState<SearchResultDetailSheet> createState() =>
      _SearchResultDetailSheetState();
}

class _SearchResultDetailSheetState
    extends ConsumerState<SearchResultDetailSheet> {
  final Map<String, bool> _grabbingReleases = {};
  final Map<String, String?> _grabErrors = {};

  @override
  Widget build(BuildContext context) {
    final result = widget.result;
    final releasesAsync = ref.watch(releasesProvider(result));

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            _buildHeader(result),
            const Divider(height: 1),
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildMetadataSection(result),
                    const Divider(height: 1),
                    _buildReleasesSection(releasesAsync),
                  ],
                ),
              ),
            ),
            _buildAddToLibraryButton(result),
          ],
        );
      },
    );
  }

  Widget _buildHeader(SearchResult result) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (result.posterUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: CachedNetworkImage(
                imageUrl: result.posterUrl!,
                width: 120,
                height: 180,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  width: 120,
                  height: 180,
                  color: MediarrColors.surfaceHover,
                  child: const Icon(
                    Icons.movie,
                    color: MediarrColors.textMuted,
                    size: 40,
                  ),
                ),
                errorWidget: (_, __, ___) => Container(
                  width: 120,
                  height: 180,
                  color: MediarrColors.surfaceHover,
                  child: const Icon(
                    Icons.movie,
                    color: MediarrColors.textMuted,
                    size: 40,
                  ),
                ),
              ),
            ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if (result.year != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${result.year}',
                    style: const TextStyle(
                      color: MediarrColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                _MediaTypeBadge(mediaType: result.mediaType),
                if (result.overview != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    result.overview!,
                    style: const TextStyle(
                      color: MediarrColors.textMuted,
                      fontSize: 13,
                    ),
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetadataSection(SearchResult result) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Text(
        result.overview ?? 'No overview available.',
        style: const TextStyle(
          color: MediarrColors.textSecondary,
          fontSize: 14,
          height: 1.5,
        ),
      ),
    );
  }

  Widget _buildReleasesSection(AsyncValue<List<Release>> releasesAsync) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Available Releases',
            style: TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          releasesAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(
                  color: MediarrColors.accentPrimary,
                ),
              ),
            ),
            error: (error, _) => Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Failed to load releases: $error',
                style: const TextStyle(
                  color: MediarrColors.statusError,
                  fontSize: 14,
                ),
              ),
            ),
            data: (releases) {
              if (releases.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'No releases found',
                    style: TextStyle(
                      color: MediarrColors.textMuted,
                      fontSize: 14,
                    ),
                  ),
                );
              }
              return Column(
                children: releases.map((release) => _ReleaseCard(
                  release: release,
                  isGrabbing: _grabbingReleases[release.guid] ?? false,
                  error: _grabErrors[release.guid],
                  onGrab: () => _grabRelease(release),
                )).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAddToLibraryButton(SearchResult result) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () => _addToLibrary(result),
          style: ElevatedButton.styleFrom(
            backgroundColor: MediarrColors.accentPrimary,
            foregroundColor: MediarrColors.textPrimary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          icon: const Icon(Icons.add),
          label: const Text('Add to Library'),
        ),
      ),
    );
  }

  Future<void> _grabRelease(Release release) async {
    setState(() {
      _grabbingReleases[release.guid] = true;
      _grabErrors[release.guid] = null;
    });

    try {
      final client = ref.read(apiClientProvider.notifier);
      await client.grabRelease(
        guid: release.guid,
        indexerId: release.indexerId,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Grabbed: ${release.title}'),
            backgroundColor: MediarrColors.statusSuccess,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _grabErrors[release.guid] = 'Failed to grab: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _grabbingReleases[release.guid] = false;
        });
      }
    }
  }

  Future<void> _addToLibrary(SearchResult result) async {
    try {
      final client = ref.read(apiClientProvider.notifier);
      if (result.isMovie) {
        await client.addMovie(
          tmdbId: result.tmdbId,
          title: result.title,
          year: result.year ?? DateTime.now().year,
          overview: result.overview,
          posterUrl: result.posterUrl,
        );
      } else {
        await client.addSeries(
          tvdbId: result.tvdbId,
          title: result.title,
          year: result.year ?? DateTime.now().year,
          overview: result.overview,
          posterUrl: result.posterUrl,
          tmdbId: result.tmdbId > 0 ? result.tmdbId : null,
        );
      }
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${result.title} added to library'),
            backgroundColor: MediarrColors.statusSuccess,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add: $e'),
            backgroundColor: MediarrColors.statusError,
          ),
        );
      }
    }
  }
}

class _ReleaseCard extends StatelessWidget {
  const _ReleaseCard({
    required this.release,
    required this.isGrabbing,
    required this.error,
    required this.onGrab,
  });

  final Release release;
  final bool isGrabbing;
  final String? error;
  final VoidCallback onGrab;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: MediarrColors.surfaceCard,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: MediarrColors.surfaceHover,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  release.title,
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (release.quality != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: MediarrColors.accentPrimary.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          release.quality!,
                          style: const TextStyle(
                            color: MediarrColors.accentPrimary,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      release.sizeFormatted,
                      style: const TextStyle(
                        color: MediarrColors.textMuted,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(
                      Icons.arrow_upward,
                      size: 12,
                      color: MediarrColors.statusSuccess,
                    ),
                    Text(
                      '${release.seeders}',
                      style: const TextStyle(
                        color: MediarrColors.statusSuccess,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                if (error != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    error!,
                    style: const TextStyle(
                      color: MediarrColors.statusError,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          isGrabbing
              ? const SizedBox(
                  width: 32,
                  height: 32,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: MediarrColors.accentPrimary,
                  ),
                )
              : IconButton(
                  onPressed: onGrab,
                  icon: const Icon(
                    Icons.download,
                    color: MediarrColors.accentPrimary,
                  ),
                  tooltip: 'Grab release',
                ),
        ],
      ),
    );
  }
}

class _MediaTypeBadge extends StatelessWidget {
  const _MediaTypeBadge({required this.mediaType});
  final String mediaType;

  @override
  Widget build(BuildContext context) {
    final isMovie = mediaType.toLowerCase() == 'movie';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: (isMovie ? MediarrColors.accentPrimary : MediarrColors.accentSecondary)
            .withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(3),
        border: Border.all(
          color: (isMovie ? MediarrColors.accentPrimary : MediarrColors.accentSecondary)
              .withValues(alpha: 0.4),
        ),
      ),
      child: Text(
        isMovie ? 'MOVIE' : 'SERIES',
        style: TextStyle(
          color: isMovie ? MediarrColors.accentPrimary : MediarrColors.accentSecondary,
          fontSize: 9,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
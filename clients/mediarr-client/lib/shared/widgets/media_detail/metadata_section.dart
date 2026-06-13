import 'package:flutter/material.dart';

import '../../../core/theme/mediarr_theme.dart';

class MetadataSection extends StatelessWidget {
  const MetadataSection({
    super.key,
    this.synopsis,
    this.genres = const [],
    this.cast = const [],
    this.rating,
    this.year,
    this.runtime,
    this.network,
  });

  final String? synopsis;
  final List<String> genres;
  final List<String> cast;
  final String? rating;
  final int? year;
  final int? runtime;
  final String? network;

  @override
  Widget build(BuildContext context) {
    final hasContent = synopsis != null ||
        genres.isNotEmpty ||
        cast.isNotEmpty ||
        rating != null ||
        year != null ||
        runtime != null ||
        network != null;

    if (!hasContent) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Year / runtime / network row
          if (year != null || runtime != null || network != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  if (year != null)
                    Text(
                      '$year',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  if (year != null && runtime != null)
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Text('\u00B7'),
                    ),
                  if (runtime != null)
                    Text(
                      '$runtime min',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  if (network != null) ...[
                    if (year != null || runtime != null)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text('\u00B7'),
                      ),
                    Text(
                      network!,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ],
              ),
            ),
          // Rating
          if (rating != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                rating!,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          // Synopsis
          if (synopsis != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                synopsis!,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ),
          // Genres
          if (genres.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  for (final genre in genres)
                    Chip(
                      label: Text(genre),
                      backgroundColor: MediarrColors.surfaceElevated,
                      labelStyle: const TextStyle(
                        color: MediarrColors.textSecondary,
                        fontSize: 12,
                      ),
                      side: const BorderSide(color: MediarrColors.borderSubtle),
                      padding: EdgeInsets.zero,
                      materialTapTargetSize:
                          MaterialTapTargetSize.shrinkWrap,
                    ),
                ],
              ),
            ),
          // Cast
          if (cast.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                for (final member in cast)
                  Chip(
                    label: Text(member),
                    backgroundColor: MediarrColors.surfaceElevated,
                    labelStyle: const TextStyle(
                      color: MediarrColors.textSecondary,
                      fontSize: 12,
                    ),
                    side: const BorderSide(color: MediarrColors.borderSubtle),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize:
                        MaterialTapTargetSize.shrinkWrap,
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

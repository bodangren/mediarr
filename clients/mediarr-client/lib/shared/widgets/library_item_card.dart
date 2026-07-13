import 'package:flutter/material.dart';

import '../../shared/models/library_item.dart';
import 'poster_card.dart';

/// A poster card specialized for [LibraryItem] display.
///
/// Wraps the generic [PosterCard] with LibraryItem-specific defaults
/// and navigation-friendly tap handling.
class LibraryItemCard extends StatelessWidget {
  const LibraryItemCard({
    super.key,
    required this.item,
    this.onTap,
    this.autofocus = false,
  });

  final LibraryItem item;
  final VoidCallback? onTap;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return PosterCard(
      title: item.title,
      posterUrl: item.posterUrl,
      year: item.year,
      monitored: item.monitored,
      // Library items don't carry quality/hasFile from the list endpoint;
      // those are detail-level fields.
      onPressed: onTap,
      autofocus: autofocus,
    );
  }
}

import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';

/// One compact chip in a library's active-view strip.
///
/// Selecting it clears the facet it represents (search text, sort, filter), so
/// the strip doubles as the way out of a narrowed view on a TV remote. Shared
/// by the Movies and Series libraries so both read the same on screen.
class LibraryViewChip extends StatelessWidget {
  const LibraryViewChip({super.key, required this.label, required this.onSelect});

  final String label;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      variant: FocusableActionVariant.button,
      borderRadius: 20,
      onSelect: onSelect,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: MediarrColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: MediarrColors.borderSubtle),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: MediarrColors.textPrimary,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

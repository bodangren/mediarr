import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../shared/models/adult_item.dart';

/// One card of the Adult library grid (track feature_adult_library_20261107).
///
/// Focusable as a single stop so the TV D-pad treats it as one control, and it always shows
/// something identifiable: the parsed title, or the filename for the review bucket.
class AdultItemCard extends StatelessWidget {
  const AdultItemCard({
    super.key,
    required this.item,
    this.onSelect,
    this.autofocus = false,
    this.imageUrl,
    this.onFocused,
  });

  final AdultItem item;
  final VoidCallback? onSelect;
  final bool autofocus;

  /// Absolute thumbnail URL when the server has a cached still for this item.
  final String? imageUrl;

  /// Fired when the card gains focus — used by the grid to prefetch the next page.
  final VoidCallback? onFocused;

  @override
  Widget build(BuildContext context) {
    final subtitle = item.subtitleLine;
    return Focus(
      autofocus: autofocus,
      onFocusChange: (hasFocus) {
        if (hasFocus) onFocused?.call();
      },
      // The remote's centre button arrives as select/enter, not as a Material ActivateIntent on
      // every device: handle both so one press always opens the item.
      onKeyEvent: (node, event) {
        if (event is KeyDownEvent &&
            (event.logicalKey == LogicalKeyboardKey.select ||
                event.logicalKey == LogicalKeyboardKey.enter ||
                event.logicalKey == LogicalKeyboardKey.gameButtonA)) {
          onSelect?.call();
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: Builder(
        builder: (focusContext) {
          final focused = Focus.of(focusContext).hasFocus;
          return Material(
            color: focused ? const Color(0xFF1F2937) : const Color(0xFF111827),
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              onTap: onSelect,
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 260,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: focused ? const Color(0xFF8B5CF6) : const Color(0xFF262635),
                    width: focused ? 2 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (imageUrl != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.network(
                          imageUrl!,
                          height: 96,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox(height: 96),
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      item.displayTitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (subtitle.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                      ),
                    ],
                    if (item.needsReview) ...[
                      const SizedBox(height: 6),
                      Text(
                        'NEEDS REVIEW',
                        style: const TextStyle(
                          color: Color(0xFFFBBF24),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

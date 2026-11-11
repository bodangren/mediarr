import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/adult_item.dart';

/// One card of the Adult library grid (track feature_adult_library_20261107).
///
/// Focusable as a single stop so the TV D-pad treats it as one control, and it always shows
/// something identifiable: the parsed title, or the filename for the review bucket.
///
/// Retention track (2026-11-11): when the item is watched and still undecided the focused card
/// reveals **Keep** / **Delete**. They are real focus stops (the app's white focus ring, no traps):
/// Down enters the actions, Left/Right move between them, Up/Back returns to the card, and Select
/// still opens the item while the card itself owns focus.
class _NoPreview extends StatelessWidget {
  const _NoPreview();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0B1220),
      alignment: Alignment.center,
      child: const Text(
        'No preview',
        style: TextStyle(color: Color(0xFF6B7280), fontSize: 12),
      ),
    );
  }
}

class AdultItemCard extends StatefulWidget {
  const AdultItemCard({
    super.key,
    required this.item,
    this.onSelect,
    this.autofocus = false,
    this.imageUrl,
    this.onFocused,
    this.focusNode,
    this.showDecisionActions = false,
    this.onKeep,
    this.onDelete,
    this.deciding = false,
  });

  final AdultItem item;
  final VoidCallback? onSelect;
  final bool autofocus;

  /// Absolute thumbnail URL when the server has a cached still for this item.
  final String? imageUrl;

  /// Fired when the card gains focus — used by the grid to prefetch the next page.
  final VoidCallback? onFocused;

  /// Optional node so the screen can restore focus after a decision removes this card's actions.
  final FocusNode? focusNode;

  /// True when this item is watched and has no keep/delete decision yet: only then are the
  /// retention actions offered.
  final bool showDecisionActions;

  final VoidCallback? onKeep;
  final VoidCallback? onDelete;

  /// A decision request for this item is in flight; the actions show no double-press.
  final bool deciding;

  @override
  State<AdultItemCard> createState() => _AdultItemCardState();
}

class _AdultItemCardState extends State<AdultItemCard> {
  late final FocusNode _cardFocus = widget.focusNode ?? FocusNode(debugLabel: 'AdultItemCard');
  final FocusNode _keepFocus = FocusNode(debugLabel: 'AdultItemCard.keep');
  final FocusNode _deleteFocus = FocusNode(debugLabel: 'AdultItemCard.delete');

  bool get _hasActions =>
      widget.showDecisionActions && (widget.onKeep != null || widget.onDelete != null);

  @override
  void dispose() {
    _keepFocus.dispose();
    _deleteFocus.dispose();
    if (widget.focusNode == null) _cardFocus.dispose();
    super.dispose();
  }

  KeyEventResult _handleCardKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final key = event.logicalKey;
    final isSelect = key == LogicalKeyboardKey.select ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.gameButtonA;
    if (isSelect) {
      // A nested action owns Select while it is focused; opening playback from here would fire
      // while the viewer meant to press Keep/Delete.
      if (!node.hasPrimaryFocus) return KeyEventResult.ignored;
      widget.onSelect?.call();
      return KeyEventResult.handled;
    }
    // Deterministic entry into the actions: directional traversal cannot reliably prefer a control
    // that sits inside this card's own rect, so Down is claimed explicitly while the card is focused.
    if (_hasActions && node.hasPrimaryFocus && key == LogicalKeyboardKey.arrowDown) {
      _keepFocus.requestFocus();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  /// Keys an action row handles for a predictable remote walk: Right always lands on Delete, Left
  /// always on Keep (a clamp, so repeated presses never overshoot), and Up or Back returns to the
  /// card — never off the card, never out of the screen.
  KeyEventResult _handleActionKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.arrowRight) {
      _deleteFocus.requestFocus();
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowLeft) {
      _keepFocus.requestFocus();
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowUp ||
        key == LogicalKeyboardKey.escape ||
        key == LogicalKeyboardKey.goBack) {
      _cardFocus.requestFocus();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  Widget _actionButton({
    required FocusNode focusNode,
    required String label,
    required IconData icon,
    required VoidCallback? onSelect,
    required Color color,
  }) {
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: (node, event) => _handleActionKey(node, event),
      child: FocusableAction(
        focusNode: focusNode,
        variant: FocusableActionVariant.button,
        borderRadius: 6,
        focusPadding: 2,
        onSelect: onSelect,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF1F2937),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: color.withValues(alpha: 0.8)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _decisionActions() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: const BoxDecoration(
        color: Color(0xF2000000),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(6)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _actionButton(
              focusNode: _keepFocus,
              label: 'Keep',
              icon: Icons.check,
              color: const Color(0xFF86EFAC),
              onSelect: widget.deciding ? null : widget.onKeep,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _actionButton(
              focusNode: _deleteFocus,
              label: 'Delete',
              icon: Icons.delete_outline,
              color: const Color(0xFFFCA5A5),
              onSelect: widget.deciding ? null : widget.onDelete,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final subtitle = widget.item.subtitleLine;
    return Focus(
      focusNode: _cardFocus,
      autofocus: widget.autofocus,
      onFocusChange: (hasFocus) {
        if (hasFocus) widget.onFocused?.call();
      },
      // The remote's centre button arrives as select/enter, not as a Material ActivateIntent on
      // every device: handle both so one press always opens the item.
      onKeyEvent: _handleCardKey,
      child: Builder(
        builder: (focusContext) {
          final focused = Focus.of(focusContext).hasFocus;
          return AnimatedScale(
            scale: focused ? 1.02 : 1.0,
            duration: const Duration(milliseconds: 120),
            child: Material(
            color: focused ? const Color(0xFF1F2937) : const Color(0xFF111827),
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              onTap: widget.onSelect,
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 260,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: focused ? const Color(0xFFA78BFA) : const Color(0xFF262635),
                    // 4 logical px ring + slight scale: a 1-2px outline was too subtle at 10 feet.
                    width: focused ? 4 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 16:9 like the source frames; a fixed 96px height cropped them to ~3.3:1 and cut
                    // subjects out (review finding from all three models, 2026-11-08).
                    Stack(
                      children: [
                        AspectRatio(
                          aspectRatio: 16 / 9,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: widget.imageUrl != null
                                ? Image.network(
                                    widget.imageUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const _NoPreview(),
                                  )
                                : const _NoPreview(),
                          ),
                        ),
                        // The decision band sits over the still so the fixed grid extent never grows
                        // and neighbours never shift when it appears (auto-paging depends on that).
                        if (focused && _hasActions)
                          Positioned(left: 0, right: 0, bottom: 0, child: _decisionActions()),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.item.displayTitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle.isEmpty ? 'No metadata' : subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: subtitle.isEmpty ? const Color(0xFF6B7280) : const Color(0xFF9CA3AF),
                        fontSize: 13,
                      ),
                    ),
                    if (widget.item.needsReview) ...[
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
                    // A durable keep is visible: the owner must be able to tell a kept item from
                    // one that merely has not been watched.
                    if (widget.item.keep) ...[
                      const SizedBox(height: 6),
                      Text(
                        'KEPT',
                        style: const TextStyle(
                          color: Color(0xFF86EFAC),
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
            ),
          );
        },
      ),
    );
  }
}

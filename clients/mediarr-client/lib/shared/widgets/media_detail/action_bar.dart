import 'package:flutter/material.dart';

import '../../../core/theme/mediarr_theme.dart';
import '../../../core/widgets/netflix_scaffold.dart';

/// Traversal order of the first action-bar button (FR-2).
///
/// It sorts after every episode row, whose orders start at 1000.
const double kActionBarOrderBase = 100000;

class ActionBarAction {
  const ActionBarAction({
    required this.label,
    this.icon,
    this.onPressed,
    this.isPrimary = false,
    this.isDestructive = false,
  });

  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isPrimary;
  final bool isDestructive;
}

class ActionBar extends StatelessWidget {
  const ActionBar({
    super.key,
    required this.actions,
    this.firstActionFocusNode,
  });

  final List<ActionBarAction> actions;

  /// Focus node of the first action (FR-2).
  ///
  /// `SeriesDetailScreen` hands this to [EpisodeList.onExitDown] so Down from
  /// the last episode lands on the first, non-destructive action instead of
  /// letting geometry pick `Delete Series`.
  final FocusNode? firstActionFocusNode;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Wrap(
        spacing: 12,
        children: [
          for (var i = 0; i < actions.length; i++)
            // FR-2: explicit order, declared left to right.
            FocusTraversalOrder(
              order: NumericFocusOrder(kActionBarOrderBase + i),
              child: FocusableAction(
                // One focus cue on every TV control (Phase 4c step 7).
                variant: FocusableActionVariant.button,
                focusNode: i == 0 ? firstActionFocusNode : null,
                onSelect: actions[i].isDestructive
                    ? () => _confirmDestructive(context, actions[i])
                    : actions[i].onPressed,
                borderRadius: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: actions[i].isPrimary
                        ? MediarrColors.accentPrimary
                        : MediarrColors.surfaceCard,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: MediarrColors.borderSubtle),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (actions[i].icon != null) ...[
                        Icon(
                          actions[i].icon,
                          size: 28,
                          color: actions[i].isDestructive
                              ? MediarrColors.statusError
                              : actions[i].isPrimary
                              ? Colors.white
                              : MediarrColors.textPrimary,
                        ),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        actions[i].label,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: actions[i].isDestructive
                              ? MediarrColors.statusError
                              : actions[i].isPrimary
                              ? Colors.white
                              : MediarrColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _confirmDestructive(BuildContext context, ActionBarAction action) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(action.label),
        content: const Text('Are you sure?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              action.onPressed?.call();
            },
            child: Text(action.label),
          ),
        ],
      ),
    );
  }
}

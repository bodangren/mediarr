import 'package:flutter/material.dart';

import '../../../core/theme/mediarr_theme.dart';
import '../../../core/widgets/netflix_scaffold.dart';

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
  });

  final List<ActionBarAction> actions;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Wrap(
        spacing: 12,
        children: [
          for (final action in actions)
            // One focus cue on every TV control (Phase 4c step 7).
            FocusableAction(
              variant: FocusableActionVariant.button,
              onSelect: action.isDestructive
                  ? () => _confirmDestructive(context, action)
                  : action.onPressed,
              borderRadius: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: action.isPrimary
                      ? MediarrColors.accentPrimary
                      : MediarrColors.surfaceCard,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: MediarrColors.borderSubtle),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (action.icon != null) ...[
                      Icon(
                        action.icon,
                        size: 28,
                        color: action.isDestructive
                            ? MediarrColors.statusError
                            : action.isPrimary
                                ? Colors.white
                                : MediarrColors.textPrimary,
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      action.label,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: action.isDestructive
                            ? MediarrColors.statusError
                            : action.isPrimary
                                ? Colors.white
                                : MediarrColors.textPrimary,
                      ),
                    ),
                  ],
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

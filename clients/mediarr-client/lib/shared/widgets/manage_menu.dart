import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';

/// One row inside the [showManageMenu] sheet.
class ManageMenuAction {
  const ManageMenuAction({
    required this.label,
    required this.icon,
    required this.onSelected,
    this.isDestructive = false,
    this.confirmLabel = 'Delete',
  });

  final String label;
  final IconData icon;
  final VoidCallback onSelected;

  /// Destructive rows are tinted red, never the autofocused first row, and
  /// always ask for confirmation before running (the confirmation used to live
  /// in the shared ActionBar, which no longer hosts these actions).
  final bool isDestructive;

  /// Text of the confirming button in the confirmation dialog.
  final String confirmLabel;
}

/// D-pad `Manage` menu for detail screens.
///
/// Owner verdict on the detail pages (2026-11-17, echoed by the Kimi K3.1 review
/// of the same screens): *"Play shares a row with Mark Watched, Search Upgrades
/// and Delete … maintenance actions dilute the primary task and increase
/// destructive-navigation risk."*
///
/// So the detail screens keep one primary playback action plus this menu. The
/// sheet is a modal route: Back dismisses it and returns focus to the Manage
/// button, and every row is a focusable D-pad target (no traps, no dead rows).

/// Asks for confirmation, then runs the destructive action.
Future<void> _confirmDestructive(BuildContext context, ManageMenuAction action) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      backgroundColor: MediarrColors.surfaceElevated,
      title: Text(
        action.label,
        style: const TextStyle(color: MediarrColors.textPrimary),
      ),
      content: const Text(
        'This cannot be undone.',
        style: TextStyle(color: MediarrColors.textSecondary),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(true),
          child: Text(action.confirmLabel),
        ),
      ],
    ),
  );
  if (confirmed == true) {
    action.onSelected();
  }
}

Future<void> showManageMenu(
  BuildContext context, {
  required List<ManageMenuAction> actions,
  String title = 'Manage',
}) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: MediarrColors.surfaceElevated,
    builder: (sheetContext) {
      // Destructive actions are ordered last inside the sheet.
      final ordered = <ManageMenuAction>[
        for (final entry in actions)
          if (!entry.isDestructive) entry,
        for (final entry in actions)
          if (entry.isDestructive) entry,
      ];
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        color: MediarrColors.textPrimary,
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  FocusableAction(
                    variant: FocusableActionVariant.button,
                    borderRadius: 8,
                    onSelect: () => Navigator.of(sheetContext).pop(),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Text(
                        'Close',
                        style: TextStyle(
                          color: MediarrColors.accentPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              for (var index = 0; index < ordered.length; index++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: FocusableAction(
                    autofocus: index == 0,
                    variant: FocusableActionVariant.button,
                    borderRadius: 8,
                    onSelect: () {
                      final action = ordered[index];
                      Navigator.of(sheetContext).pop();
                      if (action.isDestructive) {
                        // Run the confirmation after the sheet is gone so the
                        // dialog is not dismissed with the sheet's route.
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          unawaited(_confirmDestructive(context, action));
                        });
                      } else {
                        action.onSelected();
                      }
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                      decoration: BoxDecoration(
                        color: MediarrColors.surfaceCard,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: ordered[index].isDestructive
                              ? const Color(0xFF7F1D1D)
                              : MediarrColors.borderSubtle,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            ordered[index].icon,
                            size: 26,
                            color: ordered[index].isDestructive
                                ? const Color(0xFFF87171)
                                : MediarrColors.textPrimary,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                            ordered[index].label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: ordered[index].isDestructive
                                  ? const Color(0xFFF87171)
                                  : MediarrColors.textPrimary,
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    },
  );
}

import 'package:flutter/material.dart';

import 'netflix_scaffold.dart';

/// One action in a TV context menu. The menu is D-pad navigable and Back closes it (standard modal
/// pop), so it never traps the remote.
class TvContextAction {
  const TvContextAction({required this.label, required this.onSelected, this.subtitle});

  final String label;
  final String? subtitle;
  final void Function() onSelected;
}

/// Shows a centred context menu for the focused item. Selection runs the action after the menu
/// closes, so an action can navigate or start playback without fighting the dialog route.
Future<void> showTvContextMenu(
  BuildContext context, {
  required String title,
  required List<TvContextAction> actions,
}) {
  return showDialog<void>(
    context: context,
    barrierColor: const Color(0x99000000),
    builder: (dialogContext) => _TvContextMenuDialog(title: title, actions: actions),
  );
}

class _TvContextMenuDialog extends StatelessWidget {
  const _TvContextMenuDialog({required this.title, required this.actions});

  final String title;
  final List<TvContextAction> actions;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF111827),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
              const SizedBox(height: 14),
              for (var index = 0; index < actions.length; index++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: FocusableAction(
                    variant: FocusableActionVariant.button,
                    autofocus: index == 0,
                    onSelect: () {
                      Navigator.of(context).pop();
                      actions[index].onSelected();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1F2937),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(actions[index].label,
                                style: const TextStyle(color: Colors.white, fontSize: 18)),
                          ),
                          if (actions[index].subtitle != null)
                            Text(actions[index].subtitle!,
                                style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 15)),
                        ],
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 4),
              const Text('Back closes this menu',
                  style: TextStyle(color: Color(0xFF6B7280), fontSize: 14)),
            ],
          ),
        ),
      ),
    );
  }
}

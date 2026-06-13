import 'package:flutter/material.dart';

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
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Wrap(
        spacing: 8,
        children: [
          for (final action in actions)
            if (action.isDestructive)
              TextButton.icon(
                onPressed: () => _confirmDestructive(context, action),
                icon: action.icon != null ? Icon(action.icon) : const SizedBox.shrink(),
                label: Text(action.label),
                style: TextButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error,
                ),
              )
            else if (action.isPrimary)
              ElevatedButton.icon(
                onPressed: action.onPressed,
                icon: action.icon != null ? Icon(action.icon) : const SizedBox.shrink(),
                label: Text(action.label),
              )
            else
              TextButton.icon(
                onPressed: action.onPressed,
                icon: action.icon != null ? Icon(action.icon) : const SizedBox.shrink(),
                label: Text(action.label),
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

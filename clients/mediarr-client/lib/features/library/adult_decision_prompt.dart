import 'package:flutter/material.dart';

import '../../core/widgets/netflix_scaffold.dart';
import '../../core/widgets/tv_context_menu.dart';

/// Asks the owner to confirm the irreversible half of the keep/delete decision.
///
/// `delete` physically quarantines then purges the file, so it is never silent: this one focused
/// confirmation is the only gate, and **Keep it** is the default so a stray Select cannot destroy
/// a file. Back closes the dialog without deciding (returns `false`).
Future<bool> confirmAdultDelete(BuildContext context, String title) async {
  var confirmed = false;
  await showTvContextMenu(
    context,
    title: 'Delete “$title”?',
    actions: [
      TvContextAction(
        label: 'Keep it',
        subtitle: 'cancel',
        onSelected: () {},
      ),
      TvContextAction(
        label: 'Delete file',
        subtitle: 'cannot be undone',
        onSelected: () => confirmed = true,
      ),
    ],
  );
  return confirmed;
}

/// The compact keep/delete prompt shown when an adult item finishes playing.
///
/// TV-first: big targets, real D-pad focus, Keep is the default focus, and every path out is
/// explicit — Keep, Delete (after one confirmation) or Later. It never traps the remote: Back (and
/// Later) dismisses it without a decision, leaving the item in the "needs a decision" list.
class AdultDecisionPrompt extends StatefulWidget {
  const AdultDecisionPrompt({
    super.key,
    required this.title,
    required this.onKeep,
    required this.onDelete,
    required this.onDone,
    required this.onLater,
  });

  /// What the viewer just watched, shown so the decision is never ambiguous.
  final String title;

  /// Records the durable `keep` decision. Errors are shown inline, never swallowed.
  final Future<void> Function() onKeep;

  /// Runs the confirmed `delete` decision (quarantine + purge).
  final Future<void> Function() onDelete;

  /// Called after the decision is recorded, when the viewer acknowledges the receipt.
  final VoidCallback onDone;

  /// Called when the viewer defers; the item stays in the undecided list.
  final VoidCallback onLater;

  @override
  State<AdultDecisionPrompt> createState() => _AdultDecisionPromptState();
}

class _AdultDecisionPromptState extends State<AdultDecisionPrompt> {
  bool _busy = false;

  /// `keep` or `delete` once the server accepted the decision.
  String? _outcome;
  String? _error;

  /// Explicit nodes rather than `autofocus`: the prompt replaces the controls the viewer was on,
  /// and focus must land on Keep immediately — a lost focus on this screen would silently toggle
  /// play/pause on the next Select.
  final FocusNode _keepFocus = FocusNode(debugLabel: 'AdultDecisionPrompt.keep');
  final FocusNode _doneFocus = FocusNode(debugLabel: 'AdultDecisionPrompt.done');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _outcome == null) _keepFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _keepFocus.dispose();
    _doneFocus.dispose();
    super.dispose();
  }

  Future<void> _submit(String decision) async {
    if (_busy || _outcome != null) return;
    if (decision == 'delete' && !await confirmAdultDelete(context, widget.title)) {
      return;
    }
    if (!mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (decision == 'delete') {
        await widget.onDelete();
      } else {
        await widget.onKeep();
      }
      if (!mounted) return;
      setState(() => _outcome = decision);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _doneFocus.requestFocus();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = 'Could not save the decision: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final done = _outcome != null;
    return FocusScope(
      child: FocusTraversalGroup(
        child: ColoredBox(
          color: const Color(0xCC000000),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 620),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF111827),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF262635)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      done ? 'Decision saved' : 'Watched — keep it or delete it?',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 18),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      done
                          ? (_outcome == 'delete'
                              ? 'Deleted. The file was quarantined and purged.'
                              : 'Kept. Cleanup will never propose it again.')
                          : 'Delete removes the file for good; keep hides it from cleanup.',
                      style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        _error!,
                        style: const TextStyle(color: Color(0xFFF87171), fontSize: 14),
                      ),
                    ],
                    const SizedBox(height: 20),
                    if (done)
                      _PromptButton(
                        label: _outcome == 'delete' ? 'Close' : 'Done',
                        focusNode: _doneFocus,
                        filled: true,
                        onSelect: widget.onDone,
                      )
                    else
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _PromptButton(
                            label: 'Keep',
                            focusNode: _keepFocus,
                            filled: true,
                            onSelect: _busy ? null : () => _submit('keep'),
                          ),
                          _PromptButton(
                            label: 'Delete',
                            destructive: true,
                            onSelect: _busy ? null : () => _submit('delete'),
                          ),
                          _PromptButton(
                            label: 'Later',
                            onSelect: _busy ? null : widget.onLater,
                          ),
                        ],
                      ),
                    if (_busy) ...[
                      const SizedBox(height: 16),
                      const Text(
                        'Saving…',
                        style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// One big, focus-ringed action of the prompt.
class _PromptButton extends StatelessWidget {
  const _PromptButton({
    required this.label,
    this.onSelect,
    this.focusNode,
    this.filled = false,
    this.destructive = false,
  });

  final String label;
  final VoidCallback? onSelect;
  final FocusNode? focusNode;
  final bool filled;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final Color background;
    final Color foreground;
    final BoxBorder? border;
    if (filled) {
      background = Colors.white;
      foreground = Colors.black;
      border = null;
    } else if (destructive) {
      background = Colors.transparent;
      foreground = const Color(0xFFFCA5A5);
      border = Border.all(color: const Color(0xFFEF4444), width: 2);
    } else {
      background = Colors.white12;
      foreground = Colors.white;
      border = Border.all(color: Colors.white24);
    }
    return FocusableAction(
      focusNode: focusNode,
      variant: FocusableActionVariant.button,
      borderRadius: 8,
      onSelect: onSelect,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(8),
          border: border,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: foreground,
            fontSize: 18,
            fontWeight: filled ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

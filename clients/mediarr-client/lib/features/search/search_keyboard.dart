import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';

/// On-screen A–Z/0–9 keyboard for the TV search screen.
///
/// An Android TV remote has no usable text input: the system IME either never
/// opens or covers the results. This keyboard is D-pad navigable, and every key
/// activation appends (or deletes) one character on the caller's query, which
/// then runs the same debounced server search as a hardware keyboard would.
class SearchKeyboard extends StatelessWidget {
  const SearchKeyboard({
    super.key,
    required this.onCharacter,
    required this.onBackspace,
    required this.onClear,
    this.autofocus = true,
  });

  final ValueChanged<String> onCharacter;
  final VoidCallback onBackspace;
  final VoidCallback onClear;

  /// Focus the first key so a remote lands on the keyboard, not a dead panel.
  final bool autofocus;

  /// Letter rows. 7/7/7/5 keeps every key wide enough to read at 10 feet.
  static const List<String> letterRows = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ'];
  static const List<String> digitRows = ['12345', '67890'];

  @override
  Widget build(BuildContext context) {
    var focusPlaced = false;
    Widget key(String label, VoidCallback onSelect, {IconData? icon}) {
      final isFirst = autofocus && !focusPlaced;
      focusPlaced = true;
      return FocusableAction(
        variant: FocusableActionVariant.button,
        autofocus: isFirst,
        borderRadius: 8,
        onSelect: onSelect,
        focusPadding: 2,
        child: Container(
          width: 38,
          height: 38,
          alignment: Alignment.center,
          margin: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: MediarrColors.surfaceCard,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: MediarrColors.borderSubtle),
          ),
          child: icon != null
              ? Icon(icon, color: MediarrColors.textPrimary, size: 22)
              : Text(
                  label,
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final row in letterRows)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [for (final ch in row.split('')) key(ch, () => onCharacter(ch))],
          ),
        for (final row in digitRows)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [for (final ch in row.split('')) key(ch, () => onCharacter(ch))],
          ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            FocusableAction(
              variant: FocusableActionVariant.button,
              borderRadius: 8,
              focusPadding: 3,
              onSelect: () => onCharacter(' '),
              child: Container(
                height: 38,
                alignment: Alignment.center,
                margin: const EdgeInsets.all(2),
                padding: const EdgeInsets.symmetric(horizontal: 18),
                decoration: BoxDecoration(
                  color: MediarrColors.surfaceCard,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: MediarrColors.borderSubtle),
                ),
                child: const Text(
                  'Space',
                  style: TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            key('', onBackspace, icon: Icons.backspace_outlined),
            key('', onClear, icon: Icons.clear),
          ],
        ),
      ],
    );
  }
}

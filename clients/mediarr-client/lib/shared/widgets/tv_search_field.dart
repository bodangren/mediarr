import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../features/search/search_keyboard.dart';

/// D-pad-native search box for the library screens.
///
/// The previous implementation was a real `TextField`. On Android TV that hands
/// D-pad control to the **system IME**: pressing Down from the field moved focus
/// into the on-screen keyboard's shift key, and Back only dismissed the IME while
/// leaving focus in the field — so the remote appeared locked (owner report
/// 2026-11-17: "once I was in the search text area, I was unable to leave").
///
/// This widget is a normal focusable control that shows the current query and
/// opens the app's own [SearchKeyboard] in a sheet. No system IME is involved at
/// any point, so D-pad navigation stays inside the app.
class TvSearchField extends StatelessWidget {
  const TvSearchField({
    super.key,
    required this.controller,
    required this.onChanged,
    this.focusNode,
    this.width = 320,
    this.hintText = 'Search...',
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final FocusNode? focusNode;
  final double width;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: 48,
      child: FocusableAction(
        focusNode: focusNode,
        variant: FocusableActionVariant.button,
        borderRadius: 8,
        onSelect: () => _openKeyboard(context),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: MediarrColors.surfaceCard,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: MediarrColors.borderSubtle),
          ),
          child: Row(
            children: [
              const Icon(Icons.search, size: 22, color: MediarrColors.textSecondary),
              const SizedBox(width: 8),
              Expanded(
                child: ValueListenableBuilder<TextEditingValue>(
                  valueListenable: controller,
                  builder: (context, value, _) {
                    final text = value.text;
                    return Text(
                      text.isEmpty ? hintText : text,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: text.isEmpty
                            ? MediarrColors.textMuted
                            : MediarrColors.textPrimary,
                        fontSize: 18,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openKeyboard(BuildContext context) async {
    // Read from the controller each time so a reopened sheet shows the live query.
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: MediarrColors.surfaceElevated,
      builder: (sheetContext) {
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
                      child: ValueListenableBuilder<TextEditingValue>(
                        valueListenable: controller,
                        builder: (context, value, _) => Text(
                          value.text.isEmpty ? hintText : value.text,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: MediarrColors.textPrimary,
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                          ),
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
                          'Done',
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
                const SizedBox(height: 12),
                SearchKeyboard(
                  onCharacter: (character) {
                    final next = controller.text + character;
                    controller.text = next;
                    onChanged(next);
                  },
                  onBackspace: () {
                    final current = controller.text;
                    if (current.isEmpty) return;
                    final next = current.substring(0, current.length - 1);
                    controller.text = next;
                    onChanged(next);
                  },
                  onClear: () {
                    controller.text = '';
                    onChanged('');
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

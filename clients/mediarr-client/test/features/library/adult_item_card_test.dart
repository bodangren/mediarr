import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/adult_item_card.dart';
import 'package:mediarr_client/shared/models/adult_item.dart';

const _item = AdultItem(
  id: 9,
  fileName: '1000Facials - Best Asian Babes [hash].mp4',
  path: '/data/Porn/1000Facials - Best Asian Babes [hash].mp4',
  sizeBytes: 264237135,
  title: 'Best Asian Babes Blowjobs Compilation',
  studio: '1000Facials',
  quality: '1080p',
);

const _reviewItem = AdultItem(
  id: 1,
  fileName: '004 [1c6d5a2b].mp4',
  path: '/data/Porn/004 [1c6d5a2b].mp4',
  sizeBytes: 10,
  needsReview: true,
);

Widget _wrap(Widget child, {required void Function() onKey}) => MaterialApp(
      home: Shortcuts(
        shortcuts: const <ShortcutActivator, Intent>{
          SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
        },
        child: Actions(
          actions: <Type, Action<Intent>>{
            ActivateIntent: CallbackAction<ActivateIntent>(
              onInvoke: (_) { onKey(); return null; },
            ),
          },
          child: Scaffold(body: Center(child: child)),
        ),
      ),
    );

void main() {
  testWidgets('shows the parsed title and metadata line', (tester) async {
    await tester.pumpWidget(_wrap(AdultItemCard(item: _item), onKey: () {}));
    expect(find.text('Best Asian Babes Blowjobs Compilation'), findsOneWidget);
    expect(find.text('1000Facials · 1080p'), findsOneWidget);
    expect(find.text('NEEDS REVIEW'), findsNothing);
  });

  testWidgets('falls back to the filename and badges a review-bucket item', (tester) async {
    await tester.pumpWidget(_wrap(AdultItemCard(item: _reviewItem), onKey: () {}));
    expect(find.text('004 [1c6d5a2b].mp4'), findsOneWidget);
    expect(find.text('NEEDS REVIEW'), findsOneWidget);
  });

  testWidgets('activates on select, so the TV remote can open it', (tester) async {
    var activations = 0;
    await tester.pumpWidget(_wrap(AdultItemCard(item: _item, autofocus: true), onKey: () => activations++));
    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    expect(activations, 1);
  });
}

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

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: Center(child: child)));

void main() {
  testWidgets('shows the parsed title and metadata line', (tester) async {
    await tester.pumpWidget(_wrap(AdultItemCard(item: _item)));
    expect(find.text('Best Asian Babes Blowjobs Compilation'), findsOneWidget);
    expect(find.text('1000Facials · 1080p'), findsOneWidget);
    expect(find.text('NEEDS REVIEW'), findsNothing);
  });

  testWidgets('falls back to the filename and badges a review-bucket item', (tester) async {
    await tester.pumpWidget(_wrap(AdultItemCard(item: _reviewItem)));
    expect(find.text('004 [1c6d5a2b].mp4'), findsOneWidget);
    expect(find.text('NEEDS REVIEW'), findsOneWidget);
  });

  testWidgets('activates on the remote centre button', (tester) async {
    var activations = 0;
    await tester.pumpWidget(_wrap(AdultItemCard(
      item: _item,
      autofocus: true,
      onSelect: () => activations++,
    )));
    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    expect(activations, 1);
  });

  testWidgets('activates on Enter as well', (tester) async {
    var activations = 0;
    await tester.pumpWidget(_wrap(AdultItemCard(
      item: _item,
      autofocus: true,
      onSelect: () => activations++,
    )));
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.pump();
    expect(activations, 1);
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/adult_library_screen.dart';
import 'package:mediarr_client/shared/models/adult_item.dart';

import '../../support/fakes/fake_api_client.dart';

/// Owner request 2026-11-21: "sections per series and maybe tagging with tag filters".
/// The screen owns the toggle and the chips; the server owns the derived data.
AdultItem item(int id, String title, {String? seriesKey}) => AdultItem(
      id: id,
      fileName: '$title.mp4',
      path: '/data/Adult/$title.mp4',
      sizeBytes: 1000,
      title: title,
      seriesKey: seriesKey,
    );

void main() {
  testWidgets('tag chips filter the grid through the API', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..adultTagsReturn = const [
        AdultTagCount(tag: 'quality:1080p', count: 12),
        AdultTagCount(tag: 'unwatched', count: 30),
      ]
      ..adultItemsReturn = AdultItemsPage(
        items: [item(1, 'Scene One')],
        page: 1,
        pageSize: 24,
        totalCount: 1,
        needsReview: 0,
      );

    await tester.pumpWidget(MaterialApp(
      home: AdultLibraryScreen(api: api, autofocusFirst: false),
    ));
    await tester.pump();
    await tester.pump();

    expect(find.textContaining('1080p'), findsWidgets);
    // Find the chip and select it.
    final chip = find.textContaining('1080p').first;
    await tester.tap(chip);
    await tester.pump();
    await tester.pump();

    expect(api.getAdultItemsCalls.any((call) => call.tags.contains('quality:1080p')), isTrue);
  });

  testWidgets('Series toggle renders shelf rows with headers', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..adultSeriesReturn = const AdultSeriesPage(
        series: [AdultSeriesShelf(seriesKey: 'Blacked', count: 2)],
        unshelved: 1,
      )
      ..adultItemsReturn = AdultItemsPage(
        items: [
          item(1, 'Scene One', seriesKey: 'Blacked'),
          item(2, 'Scene Two', seriesKey: 'Blacked'),
        ],
        page: 1,
        pageSize: 24,
        totalCount: 2,
        needsReview: 0,
      );

    await tester.pumpWidget(MaterialApp(
      home: AdultLibraryScreen(api: api, autofocusFirst: false),
    ));
    await tester.pump();
    await tester.pump();

    await tester.tap(find.text('Series').first);
    await tester.pump();
    await tester.pump();
    await tester.pump();

    expect(find.text('Blacked'), findsWidgets);
  });

  testWidgets('search is the TV keyboard, not an IME text field', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..adultItemsReturn = AdultItemsPage(
        items: [item(1, 'Scene One')],
        page: 1,
        pageSize: 24,
        totalCount: 1,
        needsReview: 0,
      );

    await tester.pumpWidget(MaterialApp(
      home: AdultLibraryScreen(api: api, autofocusFirst: false),
    ));
    await tester.pump();
    await tester.pump();

    // The old field invited the system IME; there is no TextField on this surface now.
    expect(find.byType(TextField), findsNothing);
    expect(find.text('Search…'), findsWidgets);
  });
}

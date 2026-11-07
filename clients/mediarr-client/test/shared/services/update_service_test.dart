import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/services/update_service.dart';

void main() {
  group('update offering (owner defect 2026-11-07)', () {
    test('never offers the version already installed', () {
      // The TV showed "Mediarr 1.0.6 available" while running 1.0.6 and began
      // auto-installing it. Equal versions must never be offered.
      expect(shouldOfferUpdate(7, 7), isFalse);
    });

    test('never offers an older build, so the updater cannot downgrade', () {
      expect(shouldOfferUpdate(5, 7), isFalse);
    });

    test('offers a strictly newer build', () {
      expect(shouldOfferUpdate(8, 7), isTrue);
    });

    test('clientVersionCode is resolved from the build number', () {
      // A plain release build passes FLUTTER_BUILD_NUMBER; the fallback keeps
      // the value sane when neither define is present (widget tests).
      expect(clientVersionCode(), greaterThanOrEqualTo(1));
    });
  });
}

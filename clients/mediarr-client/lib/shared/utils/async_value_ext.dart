import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Error-safe reads of an [AsyncValue].
///
/// `AsyncValue.value` rethrows the fetch error when the provider failed.
/// Decorative data (hero metadata, row cards) must degrade to "absent"
/// instead of breaking the screen, so read it through this extension.
extension AsyncValueData<T> on AsyncValue<T> {
  /// The loaded value, or null while loading or after a fetch error.
  T? get dataOrNull => when(
        data: (value) => value,
        error: (_, __) => null,
        loading: () => null,
      );
}

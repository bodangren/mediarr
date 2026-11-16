import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Bumped whenever the app returns to the foreground.
///
/// The TV client is long-lived: the Android TV activity is paused while the
/// owner watches something else and resumed later, and the Flutter app keeps its
/// riverpod caches the whole time. Refreshing on resume (FR-6) is what makes a
/// newly imported video or a newly fetched subtitle appear without restarting
/// the app.
///
/// Screens/providers can `ref.listen(libraryRefreshProvider, ...)` when they need
/// to re-read data themselves; [AppResumeRefresher] also bumps it so widgets
/// built on this signal stay in sync.
final libraryRefreshProvider = NotifierProvider<LibraryRefreshNotifier, int>(
  LibraryRefreshNotifier.new,
);

class LibraryRefreshNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void bump() => state = state + 1;
}

/// Whether a lifecycle transition should trigger a data refresh.
///
/// Only the transition *into* [AppLifecycleState.resumed] counts: the app can be
/// told it is resumed once per foreground return (including inactive → resumed
/// when a TV activity regains focus), and repeated `resumed` events must not
/// re-fetch in a loop. Pure function so the rule is unit-testable.
bool shouldRefreshOnLifecycleChange(
  AppLifecycleState? previous,
  AppLifecycleState next,
) {
  return next == AppLifecycleState.resumed &&
      previous != AppLifecycleState.resumed;
}

/// Watches the app lifecycle and calls [onResumed] each time the app comes back
/// to the foreground (TV activity regains focus).
///
/// One refresh per resume, never a poll. [onResumed] is where the composition
/// root invalidates the cached library providers; the widget itself bumps
/// [libraryRefreshProvider] so signal-based listeners also see the resume.
class AppResumeRefresher extends ConsumerStatefulWidget {
  const AppResumeRefresher({super.key, required this.child, this.onResumed});

  final Widget child;
  final VoidCallback? onResumed;

  @override
  ConsumerState<AppResumeRefresher> createState() => _AppResumeRefresherState();
}

class _AppResumeRefresherState extends ConsumerState<AppResumeRefresher>
    with WidgetsBindingObserver {
  AppLifecycleState? _lastLifecycleState;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final previous = _lastLifecycleState;
    _lastLifecycleState = state;
    if (!shouldRefreshOnLifecycleChange(previous, state)) return;
    ref.read(libraryRefreshProvider.notifier).bump();
    widget.onResumed?.call();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

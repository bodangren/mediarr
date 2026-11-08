import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/services/api_client.dart';
import 'media_player.dart';
import 'playback_queue.dart';
import 'playback_service.dart';
import 'subtitle_renderer.dart';
import 'track_selection.dart';

/// Subtitle rendering for the video surface (FR-10). `media_kit_video` draws
/// the cue text in Flutter, so the readable size lives here — the fixed
/// [TextScaler] also disables the widget's area heuristic, which halved the
/// text on the TV's 1280x720 logical viewport.
const SubtitleViewConfiguration kPlaybackSubtitleViewConfiguration =
    SubtitleViewConfiguration(
      style: tvSubtitleTextStyle,
      textScaler: TextScaler.noScaling,
    );

/// Subtitle placement for the current overlay state.
///
/// With the transport up, cues sat directly under the rewind/play/forward row
/// and the buttons drew over the text (device capture 2026-11-08). Lifting the
/// cue block above the controls keeps both readable.
SubtitleViewConfiguration playbackSubtitleViewConfiguration({
  required bool overlayVisible,
}) => SubtitleViewConfiguration(
  style: tvSubtitleTextStyle,
  textScaler: TextScaler.noScaling,
  padding: EdgeInsets.only(
    left: 48,
    right: 48,
    bottom: overlayVisible ? 220 : 36,
  ),
);

/// Fullscreen playback surface. Phase 4b+ follow-up:
///   * No sidebar; rendered as a top-level /playback route outside the rail.
///   * Auto-hides the overlay after 4s of no input.
///   * Back while overlay visible: hides overlay (does NOT exit).
///   * Back while overlay hidden: shows overlay.
///   * "Stop" affordance on the overlay exits playback deliberately.
/// Seek jumps in seconds; index grows with repeated presses (acceleration).
const List<int> _seekSteps = [10, 30, 60, 120, 300];

class PlaybackScreen extends ConsumerStatefulWidget {
  const PlaybackScreen({
    super.key,
    required this.streamUrl,
    required this.title,
    required this.mediaId,
    required this.mediaType,
    this.nextEpisode,
    this.queue = const [],
    this.videoController,
    this.progressReporter,
  });

  final String streamUrl;
  final String title;
  final int mediaId;
  final String mediaType;

  /// Callback to play next episode (null if not applicable or last episode).
  final VoidCallback? nextEpisode;

  /// Episodes that follow the current one (FR-3).
  ///
  /// The Up Next countdown, the skip-next control, and the `Next Episode`
  /// button all read this. An empty list disables autoplay entirely.
  final List<PlaybackQueueItem> queue;

  /// Optional [VideoController]. Production callers pass `null` and the
  /// screen builds one from the playback service's underlying player.
  /// Tests inject a controller or `null` to skip `media_kit`'s native
  /// surface entirely while exercising the transport overlay and the
  /// FR-6 / FR-7 widgets.
  final VideoController? videoController;

  /// Routes progress somewhere other than the default movie/episode endpoint (the Adult library
  /// uses its own). Null keeps the standard behaviour.
  final PlaybackProgressReporter? progressReporter;

  @override
  ConsumerState<PlaybackScreen> createState() => _PlaybackScreenState();
}

/// Seconds the Up Next countdown waits before starting the next episode
/// (FR-3, owner decision 2026-10-03).
const int kUpNextCountdownSeconds = 15;

class _PlaybackScreenState extends ConsumerState<PlaybackScreen> {
  late final PlaybackService _playbackService;
  VideoController? _videoController;
  final FocusNode _rootFocusNode = FocusNode(debugLabel: 'PlaybackScreen.root');
  late String _resolvedStreamUrl;
  late String _resolvedTitle;

  /// Suppresses Back-driven overlay toggles for one frame after a
  /// deliberate Stop so a Navigator.pop doesn't double-fire.
  bool _exitInProgress = false;
  // Remote seeking acceleration: repeated Left/Right presses within 1.5 s grow the jump
  // (10 s -> 30 s -> 60 s -> 5 min). Owners asked for a way to seek far without the HUD.
  DateTime _lastSeekAt = DateTime.fromMillisecondsSinceEpoch(0);
  int _seekStepIndex = 0;
  int _seekDirection = 0;
  bool _stopRequested = false;

  // --- FR-3 autoplay state ---

  /// Episodes after the current one.
  /// Not `final`: the Up Next queue can change while the screen is alive, and a
  /// `late final` assignment in `didUpdateWidget` threw
  /// "LateInitializationError: Field '_queue' has already been initialized" on the device.
  late List<PlaybackQueueItem> _queue;

  /// Index into [_queue] of the next episode to play, or null when the queue
  /// is exhausted.
  int? _nextIndex = 0;

  /// The item currently playing, so the Up Next card can show it and the
  /// completion handler can compare.
  PlaybackQueueItem? _currentItem;

  Timer? _upNextTimer;

  /// Seconds left on the Up Next countdown, or null when the card is hidden.
  int? _upNextSecondsLeft;

  /// Set when the viewer pressed a key during the countdown. Autoplay must
  /// never trap the viewer, so any input cancels it and leaves the card up.
  bool _upNextCancelled = false;

  /// The stored autoplay preference, or null while it is still unknown.
  bool? _autoplayEnabled;

  /// This screen's playback session ownership token. Only the owner may stop
  /// the shared player when the screen is disposed.
  late final int _playbackSessionId;

  @override
  void initState() {
    super.initState();
    _queue = widget.queue;
    _nextIndex = _queue.isEmpty ? null : 0;
    _resolvedStreamUrl = widget.streamUrl;
    _resolvedTitle = widget.title;
    _playbackService = ref.read(playbackServiceProvider.notifier);
    if (widget.progressReporter != null) {
      _playbackService.progressReporter = widget.progressReporter;
    }
    final service = _playbackService;
    _playbackSessionId = service.beginSession();
    _videoController = widget.videoController;
    if (_videoController == null) {
      try {
        _videoController = VideoController(service.player);
      } catch (_) {
        _videoController = null;
      }
    }
    Future.microtask(_startPlayback);
    Future.microtask(_loadAutoplayPreference);
  }

  /// Reads the stored preference once, at start (FR-3).
  ///
  /// Read at start rather than at completion so the decision is never made on
  /// a half-resolved provider.
  Future<void> _loadAutoplayPreference() async {
    try {
      final enabled = await ref.read(autoplayNextEpisodeProvider.future);
      if (mounted) setState(() => _autoplayEnabled = enabled);
    } catch (_) {
      // A missing preference store must not break playback.
    }
  }

  @override
  void didUpdateWidget(PlaybackScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.queue != widget.queue) {
      _queue = widget.queue;
      _nextIndex = _queue.isEmpty ? null : 0;
    }
  }

  @override
  void dispose() {
    _upNextTimer?.cancel();
    if (!_stopRequested) {
      _stopRequested = true;
      // Only the session that still owns playback may stop it; a newer
      // screen's stream must survive this dispose (Kimi audit 2026-11-07).
      // `ref` is invalid during dispose, so the service captured in
      // initState is used instead.
      unawaited(_playbackService.endSession(_playbackSessionId));
    }
    _rootFocusNode.dispose();
    super.dispose();
  }

  /// The next episode to play, or null when the queue is exhausted.
  PlaybackQueueItem? get _nextItem {
    final index = _nextIndex;
    if (index == null || index < 0 || index >= _queue.length) return null;
    return _queue[index];
  }

  /// FR-3: autoplay applies to episodes only, and only when the viewer left
  /// the setting on.
  ///
  /// Fails **closed** while the preference is still unknown: an earlier version
  /// read the provider as "on" before it resolved, so a viewer who had turned
  /// autoplay off still got the next episode.
  bool get _autoplayAllowed {
    if (widget.mediaType != 'episode') return false;
    if (_nextItem == null) return false;
    if (widget.nextEpisode != null) return false;
    return _autoplayEnabled == true;
  }

  /// Shows the Up Next card and starts its countdown.
  void _startUpNext() {
    if (_nextItem == null) return;
    _upNextCancelled = false;
    setState(() => _upNextSecondsLeft = kUpNextCountdownSeconds);
    _upNextTimer?.cancel();
    _upNextTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final left = (_upNextSecondsLeft ?? 0) - 1;
      if (left <= 0) {
        timer.cancel();
        _upNextTimer = null;
        unawaited(_advanceToNext());
        return;
      }
      if (mounted) setState(() => _upNextSecondsLeft = left);
    });
  }

  /// FR-3: any key press cancels the countdown so nothing starts without a
  /// fresh decision from the viewer.
  void _cancelUpNextOnInput() {
    if (_upNextSecondsLeft == null || _upNextCancelled) return;
    _upNextTimer?.cancel();
    _upNextTimer = null;
    setState(() => _upNextCancelled = true);
  }

  void _dismissUpNext() {
    _upNextTimer?.cancel();
    _upNextTimer = null;
    if (!mounted) return;
    setState(() {
      _upNextSecondsLeft = null;
      _upNextCancelled = false;
    });
  }

  /// Starts the next episode in the queue, in this route (FR-3).
  Future<void> _advanceToNext() async {
    final next = _nextItem;
    if (next == null) {
      _dismissUpNext();
      return;
    }
    _upNextTimer?.cancel();
    _upNextTimer = null;
    _currentItem = next;
    _nextIndex = _nextIndex! + 1;
    if (_nextIndex! >= _queue.length) _nextIndex = null;
    if (!mounted) return;
    setState(() {
      _upNextSecondsLeft = null;
      _upNextCancelled = false;
    });
    await _playCurrentItem();
  }

  Future<void> _startPlayback() async {
    await _playCurrentItem();
  }

  /// Plays whatever is current: the route's media on entry, or the next queue
  /// item after an autoplay advance (FR-3).
  Future<void> _playCurrentItem() async {
    final service = ref.read(playbackServiceProvider.notifier);
    final apiClient = ref.read(apiClientProvider.notifier);

    final item = _currentItem;
    final mediaId = item?.mediaId ?? widget.mediaId;
    final mediaType = widget.mediaType;
    final fallbackUrl = item == null
        ? widget.streamUrl
        : _apiStreamUrl(mediaId);
    final fallbackTitle = item == null ? widget.title : item.label;

    _resolvedStreamUrl = fallbackUrl;
    _resolvedTitle = fallbackTitle;

    Duration resumeFrom = Duration.zero;
    var externalSubtitles = <ExternalSubtitleSource>[];
    // The Adult library has no playback manifest: it has its own stream endpoint and progress store.
    // Asking for one produced a 422 and a noisy 'manifest failed' record on every play (device,
    // 2026-11-08 02:05), so the stream URL passed in is used as-is.
    // Neither the Adult nor the YouTube library has a playback manifest: both have their own
    // stream endpoints and progress stores.
    if (mediaType != 'adult' && mediaType != 'youtube') {
    try {
      final manifest = await apiClient.getPlaybackManifest(
        mediaId: mediaId,
        type: mediaType,
      );
      if (manifest != null) {
        final baseUrl = ref.read(apiClientProvider).baseUrl ?? '';
        _resolvedStreamUrl = manifest.streamUrl.startsWith('http')
            ? manifest.streamUrl
            : '$baseUrl${manifest.streamUrl}';
        _resolvedTitle = manifest.metadata.title;
        resumeFrom = Duration(seconds: manifest.resume?.position ?? 0);
        externalSubtitles = manifest.subtitles
            .map(
              (track) => ExternalSubtitleSource(
                id: track.id,
                url: _resolveManifestUrl(track.url, baseUrl),
                languageCode: track.languageCode,
                isForced: track.isForced,
                isHi: track.isHi,
                format: track.format,
              ),
            )
            .toList();
      }
    } catch (error, stack) {
      // Best-effort fallback, but the failure is exactly what makes a viewer
      // see "nothing happens", so it is shipped to the server for triage.
      unawaited(ref.read(errorReporterProvider).report(
            message: 'playback manifest failed: $error',
            stack: stack.toString(),
            route: '/playback',
            context: {
              'mediaId': mediaId,
              'mediaType': mediaType,
              'fallbackUrl': fallbackUrl,
            },
          ));
    }
    }

    if (!mounted || _exitInProgress) return;

    // Always reset state before opening; a previous stop() in this provider
    // instance can leave status=completed, which would suppress the seek().
    service.resetForNewPlayback();
    await service.play(
      streamUrl: _resolvedStreamUrl,
      title: _resolvedTitle,
      mediaId: mediaId,
      mediaType: mediaType,
      resumeFrom: resumeFrom,
      externalSubtitles: externalSubtitles,
    );
    if (mounted) {
      // Show the overlay briefly at start so the user knows where Back lands.
      service.showOverlay();
    }
  }

  String _apiStreamUrl(int episodeId) {
    final baseUrl = ref.read(apiClientProvider).baseUrl ?? '';
    return '$baseUrl/api/stream/$episodeId?type=episode';
  }

  String _resolveManifestUrl(String url, String baseUrl) {
    final uri = Uri.parse(url);
    if (uri.hasScheme) return url;
    return Uri.parse(baseUrl).resolveUri(uri).toString();
  }

  void _exitPlayback() async {
    if (_exitInProgress) return;
    _exitInProgress = true;
    _stopRequested = true;
    final navigator = Navigator.of(context);
    final service = ref.read(playbackServiceProvider.notifier);
    await service.stop();
    if (mounted) {
      navigator.pop();
    }
  }

  bool _handleKeyEvent(
    KeyEvent event,
    PlaybackService service,
    PlaybackState playbackState,
  ) {
    if (event is! KeyDownEvent) return false;
    final key = event.logicalKey;

    // FR-3: any input during the Up Next countdown cancels it. The card stays
    // on screen so the viewer can still choose Play now or Cancel.
    if (_upNextSecondsLeft != null) {
      _cancelUpNextOnInput();
    }
    // Overlay hidden: Left/Right seek directly and never open the HUD (the old behaviour woke the
    // overlay first, so the next press walked HUD controls instead of seeking).
    final isLeft = key == LogicalKeyboardKey.arrowLeft;
    final isRight = key == LogicalKeyboardKey.arrowRight;
    if ((isLeft || isRight) && !playbackState.overlayVisible) {
      final direction = isLeft ? -1 : 1;
      final now = DateTime.now();
      if (direction == _seekDirection && now.difference(_lastSeekAt) < const Duration(milliseconds: 1500)) {
        _seekStepIndex = (_seekStepIndex + 1).clamp(0, _seekSteps.length - 1);
      } else {
        _seekStepIndex = 0;
      }
      _lastSeekAt = now;
      _seekDirection = direction;
      final seconds = _seekSteps[_seekStepIndex] * direction;
      service.seekWithFeedback(Duration(seconds: seconds));
      return true;
    }
    if (key == LogicalKeyboardKey.mediaPlayPause) {
      service.showOverlay();
      service.togglePlayPause();
      return true;
    }
    if (key == LogicalKeyboardKey.mediaPlay) {
      service.showOverlay();
      service.playMedia();
      return true;
    }
    if (key == LogicalKeyboardKey.mediaPause) {
      service.showOverlay();
      service.pauseMedia();
      return true;
    }
    if (key == LogicalKeyboardKey.mediaStop) {
      _exitPlayback();
      return true;
    }
    if (key == LogicalKeyboardKey.goBack || key == LogicalKeyboardKey.escape) {
      if (_exitInProgress) return false;
      // Kodi style: Back toggles overlay. Back with overlay hidden shows
      // overlay (does NOT exit). A separate Stop affordance exits.
      if (playbackState.overlayVisible) {
        service.hideOverlay();
      } else {
        service.showOverlay();
      }
      return false;
    }
    // FR-7: any other key wakes the overlay and restarts the 4 s hide
    // window, whatever the play state.
    service.showOverlay();
    if (!playbackState.overlayVisible) {
      // Arrows were handled above; other keys only wake the overlay.
      return false;
    }
    // Visible overlay (FR-8): the arrows walk its controls and Select
    // activates the focused control (`FocusableAction` claims Select before
    // the key bubbles here). Nothing is consumed here so traversal keeps
    // working. The only fallback is Select with no control focused.
    if (key == LogicalKeyboardKey.select ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.space) {
      final focus = FocusManager.instance.primaryFocus;
      final controlHasFocus =
          focus != null &&
          !identical(focus, _rootFocusNode) &&
          focus.context != null;
      if (!controlHasFocus) {
        service.togglePlayPause();
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final playbackState = ref.watch(playbackServiceProvider);
    final service = ref.read(playbackServiceProvider.notifier);

    // FR-8: when the overlay hides, its controls unmount and focus must
    // return to the key handler — otherwise the next press is lost.
    ref.listen<PlaybackState>(playbackServiceProvider, (previous, next) {
      if (previous?.overlayVisible == true && !next.overlayVisible) {
        _rootFocusNode.requestFocus();
      }
      // FR-3: an episode that finishes offers the next one.
      if (previous?.status != PlaybackStatus.completed &&
          next.status == PlaybackStatus.completed) {
        if (_autoplayAllowed) {
          _startUpNext();
        }
      }
    });

    return Scaffold(
      backgroundColor: Colors.black,
      body: Focus(
        focusNode: _rootFocusNode,
        // The root is a key-event anchor only. `skipTraversal` keeps it out
        // of the D-pad candidates: traversable, it covers the whole screen
        // and directional focus lands here instead of on the controls (the
        // F3 class of defect, see tv-ux-investigation-20260924.md). Focus
        // returns here when the overlay hides (see ref.listen below).
        skipTraversal: true,
        onKeyEvent: (node, event) {
          return _handleKeyEvent(event, service, playbackState)
              ? KeyEventResult.handled
              : KeyEventResult.ignored;
        },
        child: Stack(
          children: [
            // Video surface — always present, fullscreen.
            Positioned.fill(
              child: _videoController != null
                  ? Video(
                      controller: _videoController!,
                      controls: NoVideoControls,
                      subtitleViewConfiguration:
                          playbackSubtitleViewConfiguration(
                        overlayVisible: playbackState.overlayVisible,
                      ),
                    )
                  : const ColoredBox(color: Colors.black),
            ),

            if (playbackState.status == PlaybackStatus.loading ||
                playbackState.status == PlaybackStatus.buffering)
              const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 40,
                      height: 40,
                      child: CircularProgressIndicator(
                        color: MediarrColors.accentPrimary,
                        strokeWidth: 4,
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Buffering…',
                      style: TextStyle(color: Colors.white, fontSize: 20),
                    ),
                  ],
                ),
              ),

            if (playbackState.status == PlaybackStatus.error)
              _ErrorOverlay(
                error: playbackState.error ?? 'Playback error',
                onRetry: _playCurrentItem,
                onBack: _exitPlayback,
              ),

            // Transport overlay: hidden by default after 4s; Back/Select wake.
            if (playbackState.overlayVisible &&
                playbackState.status != PlaybackStatus.error)
              _TransportOverlay(
                state: playbackState,
                service: service,
                title: playbackState.mediaTitle ?? _resolvedTitle,
                onStop: _exitPlayback,
                onBack: _exitPlayback,
                // FR-3: a real skip-next when the queue has an item.
                nextEpisode:
                    widget.nextEpisode ??
                    (_nextItem == null ? null : _advanceToNext),
              ),

            // Seek feedback while the overlay stays hidden.
            if ((ref.watch(playbackServiceProvider).seekToast) case final String label)
              Positioned(
                bottom: 160,
                left: 0,
                right: 0,
                child: Center(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: const Color(0xCC000000),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                      child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 24)),
                    ),
                  ),
                ),
              ),

            // Subtitle nudge toast.
            if (playbackState.subtitleDelayToast != null)
              Positioned(
                top: 16,
                left: 0,
                right: 0,
                child: Center(
                  child: _SubtitleDelayToast(
                    label: playbackState.subtitleDelayToast!,
                  ),
                ),
              ),

            // FR-3: Up Next card with its countdown.
            if (_upNextSecondsLeft != null && _nextItem != null)
              _UpNextCard(
                item: _nextItem!,
                secondsLeft: _upNextSecondsLeft!,
                cancelled: _upNextCancelled,
                onPlayNow: _advanceToNext,
                onCancel: () {
                  _dismissUpNext();
                  service.showOverlay();
                },
              ),

            // Completed overlay.
            if (playbackState.status == PlaybackStatus.completed &&
                _upNextSecondsLeft == null)
              _CompletedOverlay(
                onReplay: () => service.play(
                  streamUrl: _resolvedStreamUrl,
                  title: _resolvedTitle,
                  mediaId: widget.mediaId,
                  mediaType: widget.mediaType,
                  resumeFrom: Duration.zero,
                ),
                onNext:
                    widget.nextEpisode ??
                    (_nextItem == null ? null : _advanceToNext),
                onBack: _exitPlayback,
              ),
          ],
        ),
      ),
    );
  }
}

/// FR-3: the Netflix-style Up Next card.
///
/// Shows the next episode, a countdown, `Play now`, and `Cancel`. Any key
/// press cancels the countdown and leaves this card up, so autoplay never
/// starts something the viewer did not choose.
class _UpNextCard extends StatelessWidget {
  const _UpNextCard({
    required this.item,
    required this.secondsLeft,
    required this.cancelled,
    required this.onPlayNow,
    required this.onCancel,
  });

  final PlaybackQueueItem item;
  final int secondsLeft;
  final bool cancelled;
  final VoidCallback onPlayNow;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: const Color(0xF0000000),
        // FR-8b: own scope so `Play now`'s autofocus fires when the card
        // mounts over an already-focused playback screen (see
        // _TransportOverlay for the full story).
        child: FocusScope(
          child: Center(
            child: FocusTraversalGroup(
              policy: OrderedTraversalPolicy(),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Up Next',
                    style: TextStyle(
                      color: MediarrColors.accentPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    item.label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 40,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item.title,
                    style: const TextStyle(color: Colors.white70, fontSize: 20),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    cancelled
                        ? 'Autoplay cancelled'
                        : 'Starting in $secondsLeft',
                    style: const TextStyle(color: Colors.white70, fontSize: 18),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      FocusableAction(
                        autofocus: true,
                        variant: FocusableActionVariant.button,
                        borderRadius: 8,
                        onSelect: onPlayNow,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 28,
                            vertical: 14,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Play now',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      FocusableAction(
                        variant: FocusableActionVariant.button,
                        borderRadius: 8,
                        onSelect: onCancel,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 28,
                            vertical: 14,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.white),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Cancel',
                            style: TextStyle(color: Colors.white, fontSize: 20),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorOverlay extends StatelessWidget {
  const _ErrorOverlay({required this.error, this.onRetry, this.onBack});

  final String error;
  final VoidCallback? onRetry;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    // Owner defect 2026-11-07: the error was a dead end — a raw URL in 13 px
    // text and no action. A TV viewer must always be able to retry or go back
    // without touching another device.
    final technical = error;
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error, color: MediarrColors.statusError, size: 64),
            const SizedBox(height: 16),
            const Text(
              "Couldn't play this video",
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'The server or the file may be unavailable.',
              style: TextStyle(color: Colors.white70, fontSize: 20),
            ),
            const SizedBox(height: 28),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (onRetry != null)
                  FocusableAction(
                    autofocus: true,
                    variant: FocusableActionVariant.button,
                    onSelect: onRetry,
                    borderRadius: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 28,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: MediarrColors.accentPrimary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.refresh, size: 28, color: Colors.white),
                          SizedBox(width: 10),
                          Text(
                            'Retry',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (onRetry != null && onBack != null) const SizedBox(width: 16),
                if (onBack != null)
                  FocusableAction(
                    variant: FocusableActionVariant.button,
                    onSelect: onBack,
                    borderRadius: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 28,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white12,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white38),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.arrow_back, size: 28, color: Colors.white),
                          SizedBox(width: 10),
                          Text(
                            'Back',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: 900,
              child: Text(
                technical,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white38, fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Transport overlay: title, seek bar, transport buttons, subtitle nudge,
/// and Stop. Auto-hides 4s after the last input (handled by PlaybackService).
class _TransportOverlay extends StatefulWidget {
  const _TransportOverlay({
    required this.state,
    required this.service,
    required this.title,
    required this.onStop,
    required this.onBack,
    this.nextEpisode,
  });

  final PlaybackState state;
  final PlaybackService service;
  final String title;
  final VoidCallback onStop;
  final VoidCallback onBack;
  final VoidCallback? nextEpisode;

  @override
  State<_TransportOverlay> createState() => _TransportOverlayState();
}

class _TransportOverlayState extends State<_TransportOverlay> {
  bool _syncOpen = false;

  PlaybackState get state => widget.state;
  PlaybackService get service => widget.service;
  String get title => widget.title;
  VoidCallback get onStop => widget.onStop;
  VoidCallback get onBack => widget.onBack;
  VoidCallback? get nextEpisode => widget.nextEpisode;

  @override
  Widget build(BuildContext context) {
    // FR-8: one traversal group over the controls so Left and Right walk
    // them. Visibility itself is driven by `overlayVisible` in the parent.
    // OrderedTraversalPolicy matches NetflixScaffold, whose groups walk with
    // the D-pad on every browse screen.
    //
    // FR-8b: the overlay gets its OWN FocusScope. It mounts and unmounts with
    // visibility, and Flutter's `autofocus` only requests focus when the
    // enclosing scope has no focused child. Sharing the playback root's
    // scope meant the root node (which takes focus every time the overlay
    // hides) suppressed the autofocus on remount — the overlay came up with
    // no control focused, arrows did nothing, and Select fell through to a
    // global play/pause fallback (owner report 2026-10-03). A fresh scope has
    // no focused child, so Back's autofocus fires on every mount.
    return FocusScope(
      child: FocusTraversalGroup(
        policy: OrderedTraversalPolicy(),
        child: Stack(
          children: [
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0xE6000000),
                      Color(0x00000000),
                      Color(0x00000000),
                      Color(0xE6000000),
                    ],
                    stops: [0.0, 0.18, 0.6, 1.0],
                  ),
                ),
              ),
            ),
            // Top bar.
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    _IconActionButton(
                      icon: Icons.arrow_back,
                      tooltip: 'Back',
                      onPressed: onBack,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    _SyncToggle(
                      open: _syncOpen,
                      delay: state.subtitleDelay,
                      onPressed: () => setState(() => _syncOpen = !_syncOpen),
                    ),
                    const SizedBox(width: 8),
                    _IconActionButton(
                      icon: Icons.stop_circle_outlined,
                      tooltip: 'Stop playback',
                      onPressed: onStop,
                    ),
                  ],
                ),
              ),
            ),
            // Sync panel: under the top bar so it never covers subtitles.
            if (_syncOpen)
              Positioned(
                top: 84,
                right: 16,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xCC000000),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: _SubtitleNudgeBar(service: widget.service),
                    ),
                    const SizedBox(height: 6),
                    FocusableAction(
                      variant: FocusableActionVariant.button,
                      borderRadius: 8,
                      onSelect: () => setState(() => _syncOpen = false),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        child: Text('Hide sync',
                            style: TextStyle(color: Colors.white54, fontSize: 16)),
                      ),
                    ),
                  ],
                ),
              ),
            // Bottom: seek + transport.
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _SeekBar(state: state, service: service),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _formatDuration(state.position),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              _formatDuration(state.duration),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                            const SizedBox(width: 10),
                            // Remaining time: reviewers said 00:10 / 27:49 alone makes the viewer do
                            // the subtraction at 10 feet.
                            Text(
                              '-${_formatDuration(state.duration - state.position)}',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 18,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _IconActionButton(
                          icon: Icons.replay_10,
                          onPressed: () => service.seekRelative(
                            const Duration(seconds: -10),
                          ),
                        ),
                        const SizedBox(width: 32),
                        _IconActionButton(
                          icon: state.status == PlaybackStatus.playing
                              ? Icons.pause_circle_filled
                              : Icons.play_circle_filled,
                          size: 104,
                          color: MediarrColors.accentPrimary,
                          // Entry focus belongs on the one control a viewer
                          // uses most; Back used to hold it (UX review).
                          autofocus: true,
                          onPressed: service.togglePlayPause,
                        ),
                        const SizedBox(width: 32),
                        _IconActionButton(
                          icon: Icons.forward_10,
                          onPressed: () =>
                              service.seekRelative(const Duration(seconds: 10)),
                        ),
                        if (nextEpisode != null) ...[
                          const SizedBox(width: 24),
                          _IconActionButton(
                            icon: Icons.skip_next,
                            onPressed: nextEpisode!,
                          ),
                        ],
                        const SizedBox(width: 32),
                        _IconActionButton(
                          icon: Icons.closed_caption,
                          onPressed: () =>
                              _showSubtitlePicker(context, state, service),
                        ),
                      ],
                    ),

                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSubtitlePicker(
    BuildContext context,
    PlaybackState state,
    PlaybackService service,
  ) {
    final tracks = state.subtitleTracks;
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: const Color(0xFF111111),
        title: const Text('Subtitles', style: TextStyle(color: Colors.white)),
        content: SizedBox(
          width: 320,
          child: tracks.isEmpty
              ? const Text(
                  'No subtitle tracks available',
                  style: TextStyle(color: Colors.white70),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ListTile(
                      title: const Text(
                        'Off',
                        style: TextStyle(color: Colors.white),
                      ),
                      trailing: state.selectedSubtitleIndex == null
                          ? const Icon(
                              Icons.check,
                              color: MediarrColors.accentPrimary,
                            )
                          : null,
                      onTap: () {
                        service.selectSubtitle(null);
                        Navigator.of(dialogContext).pop();
                      },
                    ),
                    for (var i = 0; i < tracks.length; i++)
                      ListTile(
                        title: Text(
                          _trackLabel(tracks[i], i),
                          style: const TextStyle(color: Colors.white),
                        ),
                        trailing: state.selectedSubtitleIndex == i
                            ? const Icon(
                                Icons.check,
                                color: MediarrColors.accentPrimary,
                              )
                            : null,
                        onTap: () {
                          service.selectSubtitle(i);
                          Navigator.of(dialogContext).pop();
                        },
                      ),
                  ],
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  String _trackLabel(SubtitleTrackInfo track, int index) {
    final parts = <String>[
      if (track.title != null && track.title!.isNotEmpty) track.title!,
      if (track.language != null && track.language!.isNotEmpty) track.language!,
    ];
    final tag = parts.isEmpty ? 'Track ${index + 1}' : parts.join(' · ');
    return tag;
  }
}

class _IconActionButton extends StatelessWidget {
  const _IconActionButton({
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.size = 64,
    this.color = Colors.white,
    this.autofocus = false,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final String? tooltip;
  final double size;
  final Color color;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      onSelect: onPressed,
      autofocus: autofocus,
      variant: FocusableActionVariant.button,
      borderRadius: 8,
      scale: 1.04,
      child: Container(
        padding: const EdgeInsets.all(6),
        // The Material IconButton is pointer affordance only (F14: one focus
        // cue). Without ExcludeFocus it is a second traversal stop inside the
        // FocusableAction and D-pad presses land in the wrong layer.
        child: ExcludeFocus(
          child: IconButton(
            tooltip: tooltip,
            icon: Icon(icon, color: color, size: size),
            onPressed: onPressed,
          ),
        ),
      ),
    );
  }
}

class _SeekBar extends StatelessWidget {
  const _SeekBar({required this.state, required this.service});
  final PlaybackState state;
  final PlaybackService service;

  @override
  Widget build(BuildContext context) {
    return SliderTheme(
      data: SliderTheme.of(context).copyWith(
        trackHeight: 8,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 16),
        activeTrackColor: MediarrColors.accentPrimary,
        inactiveTrackColor: Colors.white24,
        thumbColor: MediarrColors.accentPrimary,
      ),
      // FR-8: the bar is pointer-only. Flutter's Slider consumes all four
      // arrows for value adjustment, which traps D-pad focus here; seeking
      // with the remote is the hidden-overlay Left/Right path.
      child: ExcludeFocus(
        child: Slider(
          value: state.progress.clamp(0.0, 1.0),
          onChanged: (value) {
            final target = Duration(
              milliseconds: (value * state.duration.inMilliseconds).round(),
            );
            service.seekTo(target);
          },
        ),
      ),
    );
  }
}

/// Compact labelled toggle for the subtitle sync panel.
///
/// The raw "-5s … Reset" row used to sit unexplained under the transport and
/// collided with the subtitle line (owner: "what is that for?"). It is now a
/// labelled **Sync** toggle whose panel opens under the top bar.
class _SyncToggle extends StatelessWidget {
  const _SyncToggle({
    required this.open,
    required this.delay,
    required this.onPressed,
  });

  final bool open;
  final Duration delay;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final label = delay == Duration.zero
        ? 'Sync'
        : 'Sync ${delay.inMilliseconds > 0 ? '+' : ''}'
            '${(delay.inMilliseconds / 1000).toStringAsFixed(1)}s';
    return FocusableAction(
      variant: FocusableActionVariant.button,
      borderRadius: 8,
      onSelect: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: open ? Colors.white24 : Colors.white12,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.white24),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.tune, size: 22, color: Colors.white70),
            const SizedBox(width: 8),
            Text(label,
                style: const TextStyle(color: Colors.white70, fontSize: 18)),
          ],
        ),
      ),
    );
  }
}

/// Kodi-style subtitle nudge bar (FR-7).
class _SubtitleNudgeBar extends StatelessWidget {
  const _SubtitleNudgeBar({required this.service});
  final PlaybackService service;

  @override
  Widget build(BuildContext context) {
    const labels = [
      ('-5s', Duration(seconds: -5)),
      ('-1s', Duration(seconds: -1)),
      ('-0.5s', Duration(milliseconds: -500)),
      ('+0.5s', Duration(milliseconds: 500)),
      ('+1s', Duration(seconds: 1)),
      ('+5s', Duration(seconds: 5)),
    ];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 8,
        runSpacing: 6,
        children: [
          for (final (label, step) in labels)
            FocusableAction(
              onSelect: () => service.nudgeSubtitleDelay(step),
              variant: FocusableActionVariant.button,
              borderRadius: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  label,
                  style: const TextStyle(color: Colors.white, fontSize: 20),
                ),
              ),
            ),
          FocusableAction(
            onSelect: () => service.resetSubtitleDelay(),
            variant: FocusableActionVariant.button,
            borderRadius: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'Reset',
                style: TextStyle(color: Colors.white, fontSize: 20),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubtitleDelayToast extends StatelessWidget {
  const _SubtitleDelayToast({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 14),
      ),
    );
  }
}

class _CompletedOverlay extends StatelessWidget {
  const _CompletedOverlay({
    required this.onReplay,
    required this.onBack,
    this.onNext,
  });

  final VoidCallback onReplay;
  final VoidCallback onBack;
  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    // FR-8b: own scope (see _TransportOverlay) AND an explicit autofocus on
    // the first action — without one, no control owned focus on this overlay
    // at all, leaving it as dead as the transport overlay was.
    return FocusScope(
      child: ColoredBox(
        color: const Color(0xE6000000),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.check_circle,
                color: MediarrColors.statusSuccess,
                size: 64,
              ),
              const SizedBox(height: 16),
              const Text(
                'Playback Complete',
                style: TextStyle(color: Colors.white, fontSize: 20),
              ),
              const SizedBox(height: 24),
              Wrap(
                spacing: 12,
                children: [
                  FocusableAction(
                    autofocus: true,
                    onSelect: onReplay,
                    variant: FocusableActionVariant.button,
                    borderRadius: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Replay',
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  if (onNext != null) ...[
                    const SizedBox(width: 12),
                    FocusableAction(
                      onSelect: onNext!,
                      variant: FocusableActionVariant.button,
                      borderRadius: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white24,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Next Episode',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(width: 12),
                  FocusableAction(
                    onSelect: onBack,
                    variant: FocusableActionVariant.button,
                    borderRadius: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Back',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatDuration(Duration d) {
  final hours = d.inHours;
  final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  if (hours > 0) return '$hours:$minutes:$seconds';
  return '$minutes:$seconds';
}

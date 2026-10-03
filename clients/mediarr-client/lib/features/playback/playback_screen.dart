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

/// Fullscreen playback surface. Phase 4b+ follow-up:
///   * No sidebar; rendered as a top-level /playback route outside the rail.
///   * Auto-hides the overlay after 4s of no input.
///   * Back while overlay visible: hides overlay (does NOT exit).
///   * Back while overlay hidden: shows overlay.
///   * "Stop" affordance on the overlay exits playback deliberately.
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
  bool _stopRequested = false;

  // --- FR-3 autoplay state ---

  /// Episodes after the current one.
  late final List<PlaybackQueueItem> _queue;

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

  @override
  void initState() {
    super.initState();
    _queue = widget.queue;
    _nextIndex = _queue.isEmpty ? null : 0;
    _resolvedStreamUrl = widget.streamUrl;
    _resolvedTitle = widget.title;
    _playbackService = ref.read(playbackServiceProvider.notifier);
    final service = _playbackService;
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
      unawaited(_stopPlaybackOnDispose());
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

  Future<void> _stopPlaybackOnDispose() async {
    try {
      await _playbackService.stop();
    } catch (_) {
      // Route disposal must not report an unhandled playback error.
    }
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
    final fallbackUrl =
        item == null ? widget.streamUrl : _apiStreamUrl(mediaId);
    final fallbackTitle = item == null ? widget.title : item.label;

    _resolvedStreamUrl = fallbackUrl;
    _resolvedTitle = fallbackTitle;

    Duration resumeFrom = Duration.zero;
    var externalSubtitles = <ExternalSubtitleSource>[];
    try {
      final manifest =
          await apiClient.getPlaybackManifest(mediaId: mediaId, type: mediaType);
      if (manifest != null) {
        final baseUrl = ref.read(apiClientProvider).baseUrl ?? '';
        _resolvedStreamUrl = manifest.streamUrl.startsWith('http')
            ? manifest.streamUrl
            : '$baseUrl${manifest.streamUrl}';
        _resolvedTitle = manifest.metadata.title;
        resumeFrom = Duration(seconds: manifest.resume?.position ?? 0);
        externalSubtitles = manifest.subtitles
            .map((track) => ExternalSubtitleSource(
                  id: track.id,
                  url: _resolveManifestUrl(track.url, baseUrl),
                  languageCode: track.languageCode,
                  isForced: track.isForced,
                  isHi: track.isHi,
                  format: track.format,
                ))
            .toList();
      }
    } catch (_) {
      // Best-effort; fallback to route-provided stream URL.
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

  bool _handleKeyEvent(KeyEvent event, PlaybackService service,
      PlaybackState playbackState) {
    if (event is! KeyDownEvent) return false;
    final key = event.logicalKey;

    // FR-3: any input during the Up Next countdown cancels it. The card stays
    // on screen so the viewer can still choose Play now or Cancel.
    if (_upNextSecondsLeft != null) {
      _cancelUpNextOnInput();
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
      // Hidden overlay: the video surface owns the arrows (FR-8), so Left
      // and Right seek. The other keys only wake the overlay.
      if (key == LogicalKeyboardKey.arrowLeft) {
        service.seekRelative(const Duration(seconds: -10));
      } else if (key == LogicalKeyboardKey.arrowRight) {
        service.seekRelative(const Duration(seconds: 10));
      }
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
      final controlHasFocus = focus != null &&
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
                          kPlaybackSubtitleViewConfiguration,
                    )
                  : const ColoredBox(color: Colors.black),
            ),

            if (playbackState.status == PlaybackStatus.loading ||
                playbackState.status == PlaybackStatus.buffering)
              const Center(
                child: CircularProgressIndicator(
                  color: MediarrColors.accentPrimary,
                ),
              ),

            if (playbackState.status == PlaybackStatus.error)
              _ErrorOverlay(error: playbackState.error ?? 'Playback error'),

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
                nextEpisode: widget.nextEpisode ??
                    (_nextItem == null ? null : _advanceToNext),
              ),

            // Subtitle nudge toast.
            if (playbackState.subtitleDelayToast != null)
              Positioned(
                top: 16,
                left: 0,
                right: 0,
                child: Center(
                  child:
                      _SubtitleDelayToast(label: playbackState.subtitleDelayToast!),
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
                onNext: widget.nextEpisode ??
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
                  cancelled ? 'Autoplay cancelled' : 'Starting in $secondsLeft',
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
                            horizontal: 28, vertical: 14),
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
                            horizontal: 28, vertical: 14),
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
    );
  }
}

class _ErrorOverlay extends StatelessWidget {
  const _ErrorOverlay({required this.error});
  final String error;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error, color: MediarrColors.statusError, size: 48),
            const SizedBox(height: 12),
            Text(
              'Playback error',
              style: const TextStyle(color: Colors.white, fontSize: 18),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 48),
              child: Text(
                error,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 13),
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
class _TransportOverlay extends StatelessWidget {
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
  Widget build(BuildContext context) {
    // FR-8: one traversal group over the controls so Left and Right walk
    // them. Visibility itself is driven by `overlayVisible` in the parent.
    // OrderedTraversalPolicy matches NetflixScaffold, whose groups walk with
    // the D-pad on every browse screen.
    return FocusTraversalGroup(
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
                    autofocus: true,
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
                  _IconActionButton(
                    icon: Icons.stop_circle_outlined,
                    tooltip: 'Stop playback',
                    onPressed: onStop,
                  ),
                ],
              ),
            ),
          ),
          // Bottom: seek + transport + subtitle nudge.
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
                        style: const TextStyle(color: Colors.white70, fontSize: 18),
                      ),
                      Text(
                        _formatDuration(state.duration),
                        style: const TextStyle(color: Colors.white70, fontSize: 18),
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
                            const Duration(seconds: -10)),
                      ),
                      const SizedBox(width: 32),
                      _IconActionButton(
                        icon: state.status == PlaybackStatus.playing
                            ? Icons.pause_circle_filled
                            : Icons.play_circle_filled,
                        size: 96,
                        color: MediarrColors.accentPrimary,
                        onPressed: service.togglePlayPause,
                      ),
                      const SizedBox(width: 32),
                      _IconActionButton(
                        icon: Icons.forward_10,
                        onPressed: () => service.seekRelative(
                            const Duration(seconds: 10)),
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
                  const SizedBox(height: 16),
                  _SubtitleNudgeBar(service: service),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showSubtitlePicker(
      BuildContext context, PlaybackState state, PlaybackService service) {
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
                      title: const Text('Off',
                          style: TextStyle(color: Colors.white)),
                      trailing: state.selectedSubtitleIndex == null
                          ? const Icon(Icons.check,
                              color: MediarrColors.accentPrimary)
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
                            ? const Icon(Icons.check,
                                color: MediarrColors.accentPrimary)
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
      if (track.language != null && track.language!.isNotEmpty)
        track.language!,
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
    this.size = 56,
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
        trackHeight: 6,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
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
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 10,
              ),
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
    return ColoredBox(
      color: const Color(0xE6000000),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle,
                color: MediarrColors.statusSuccess, size: 64),
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
                  onSelect: onReplay,
                  variant: FocusableActionVariant.button,
                  borderRadius: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('Replay',
                        style: TextStyle(
                            color: Colors.black, fontWeight: FontWeight.w700)),
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
                          horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('Next Episode',
                          style: TextStyle(color: Colors.white)),
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
                        horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('Back',
                        style: TextStyle(color: Colors.white)),
                  ),
                ),
              ],
            ),
          ],
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

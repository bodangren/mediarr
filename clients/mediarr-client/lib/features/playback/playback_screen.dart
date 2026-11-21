import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/services/api_client.dart';
import '../../shared/widgets/digital_clock.dart';
import '../library/adult_decision_prompt.dart';
import '../library/continue_watching_section.dart';
import 'media_player.dart';
import 'playback_queue.dart';
import 'playback_service.dart';
import 'subtitle_renderer.dart';
import 'track_selection.dart';

/// Subtitle rendering for the video surface (FR-10). `media_kit_video` draws
/// the cue text in Flutter, so the readable size lives here — the fixed
/// [TextScaler] also disables the widget's area heuristic, which halved the
/// text on the TV's 1280x720 logical viewport.
///
/// Subtitle placement is anchored to the bottom of the screen: the owner's rule
/// (2026-11-21) is that cues are bottom-justified, not centred.
///
/// `media_kit_video` 1.3.1's `SubtitleView` captures `configuration.padding` once in
/// its State (`late EdgeInsets padding = widget.configuration.padding`) and only
/// changes it through `setPadding()` — a rebuilt `Video(subtitleViewConfiguration: …)`
/// is ignored. So the initial value comes from the configuration below and every later
/// overlay toggle is applied through `VideoState.setSubtitleViewPadding`, which the
/// library does honour.
const double kSubtitleBottomPaddingOverlayHidden = 36;
/// Transport row top sits ~190 logical px from the bottom (72 px button, seek bar
/// above it, margins); 260 clears it with room for two lines.
const double kSubtitleBottomPaddingOverlayVisible = 260;

/// Cue alignment for one overlay state (bottom-left/right margins are symmetric).
///
/// The two values are cached constants on purpose: `Video`'s state compares
/// `subtitleViewConfiguration` by identity in `didUpdateWidget`, so building a fresh
/// object on every frame made the surface look reconfigured on each position tick
/// (4-5 times a second) — constant rebuild churn on the video path that grows with
/// playback time. Identity-stable objects keep the surface quiet.
final SubtitleViewConfiguration _kSubtitleConfigOverlayHidden =
    SubtitleViewConfiguration(
  style: tvSubtitleTextStyle,
  textScaler: TextScaler.noScaling,
  padding: const EdgeInsets.only(
    left: 48,
    right: 48,
    bottom: kSubtitleBottomPaddingOverlayHidden,
  ),
);
final SubtitleViewConfiguration _kSubtitleConfigOverlayVisible =
    SubtitleViewConfiguration(
  style: tvSubtitleTextStyle,
  textScaler: TextScaler.noScaling,
  padding: const EdgeInsets.only(
    left: 48,
    right: 48,
    bottom: kSubtitleBottomPaddingOverlayVisible,
  ),
);

SubtitleViewConfiguration playbackSubtitleViewConfiguration({
  required bool overlayVisible,
}) => overlayVisible
    ? _kSubtitleConfigOverlayVisible
    : _kSubtitleConfigOverlayHidden;


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
    this.youtubeQueue = const [],
    this.resumeFrom = Duration.zero,
    this.videoController,
    this.progressReporter,
  });

  final String streamUrl;
  final String title;
  final int mediaId;
  final String mediaType;

  /// Resume point known by the caller (e.g. a Continue Watching row). The manifest may refine it,
  /// but it must never be lost when the manifest request fails or returns no resume.
  final Duration resumeFrom;

  /// Callback to play next episode (null if not applicable or last episode).
  final VoidCallback? nextEpisode;

  /// Episodes that follow the current one (FR-3).
  ///
  /// The Up Next countdown, the skip-next control, and the `Next Episode`
  /// button all read this. An empty list disables autoplay entirely.
  final List<PlaybackQueueItem> queue;

  /// YouTube videos that follow the current one ("Play all" on the YouTube
  /// library).
  ///
  /// Same contract as [queue], for the YouTube domain: the stream URL and
  /// progress endpoint are derived from each item's video id, and the library
  /// order (sort/filter/search) is preserved by the caller.
  final List<YoutubePlaybackItem> youtubeQueue;

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
  /// Exposes `setSubtitleViewPadding` for the overlay lift; see the config comment.
  final GlobalKey<VideoState> _videoKey = GlobalKey<VideoState>();

  /// Frame-timing telemetry: proves (or disproves) framerate collapse on the device.
  /// The owner reported video falling to 2-3 fps after ~10 minutes (2026-11-21) and the
  /// client had no number for it, so every 30 s of playback reports fps and jank as
  /// severity 'smoke' (ignored by triage, kept in /config/client-errors.jsonl).
  Timer? _frameTelemetryTimer;
  int _framesSinceReport = 0;
  int _jankyFramesSinceReport = 0;
  double _worstBuildMs = 0;
  int _telemetryStartedAtMs = 0;
  final FocusNode _rootFocusNode = FocusNode(debugLabel: 'PlaybackScreen.root');
  late String _resolvedStreamUrl;
  late String _resolvedTitle;

  /// Suppresses Back-driven overlay toggles for one frame after a
  /// deliberate Stop so a Navigator.pop doesn't double-fire.
  bool _exitInProgress = false;
  /// Set only by _exitPlayback: PopScope blocks system Back so it can toggle the HUD instead of
  /// ending playback (owner report 2026-11-08).
  bool _allowPop = false;
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

  /// YouTube videos after the current one ("Play all").
  ///
  /// A separate list and index from [_queue]: the YouTube domain has no
  /// seasons and derives its stream URL from a video id.
  late List<YoutubePlaybackItem> _youtubeItems;

  /// Index into [_youtubeItems] of the next video to play, or null when the
  /// queue is exhausted.
  int? _youtubeIndex = 0;

  /// The YouTube video currently playing, or null when this playback is not
  /// from the YouTube library.
  YoutubePlaybackItem? _currentYoutubeItem;

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

  // --- Adult retention: keep/delete after watching (track feature_adult_retention_keep_delete_20261111) ---

  /// True while the keep/delete prompt covers the player.
  bool _adultPromptVisible = false;

  /// The decision accepted by the server (`keep`/`delete`) for this session, if any.
  String? _adultDecision;

  /// The viewer deferred once; never re-prompt for this item in this session.
  bool _adultPromptDismissed = false;

  bool get _isAdultPlayback => widget.mediaType == 'adult';

  // --- Subtitle picker (FR-4) ---

  /// True while the subtitle picker covers the player.
  ///
  /// The picker is rendered in this screen's Stack, not as a `showDialog`
  /// route. A route is a separate focus scope, so the HUD's auto-hide window
  /// could park focus back on the playback root while the picker was still on
  /// screen — the picker then looked frozen and the remote could not leave it
  /// (owner report 2026-11-16).
  bool _subtitlePickerVisible = false;

  @override
  void initState() {
    super.initState();
    _queue = widget.queue;
    _nextIndex = _queue.isEmpty ? null : 0;
    _youtubeItems = widget.youtubeQueue;
    _youtubeIndex = _youtubeItems.isEmpty ? null : 0;
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
    _startFrameTelemetry();
  }

  void _startFrameTelemetry() {
    SchedulerBinding.instance.addTimingsCallback(_onFrameTimings);
    _telemetryStartedAtMs = DateTime.now().millisecondsSinceEpoch;
    _frameTelemetryTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      final nowMs = DateTime.now().millisecondsSinceEpoch;
      final windowMs = nowMs - _telemetryStartedAtMs;
      if (windowMs <= 0) return;
      final fps = _framesSinceReport * 1000 / windowMs;
      final jankPct = _framesSinceReport == 0
          ? 0
          : (_jankyFramesSinceReport * 100 / _framesSinceReport).round();
      ref.read(errorReporterProvider).report(
        message: 'playback-frames fps=${fps.toStringAsFixed(1)} '
            'jank=$jankPct% worstBuild=${_worstBuildMs.toStringAsFixed(1)}ms '
            'frames=$_framesSinceReport',
        severity: 'smoke',
        route: 'playback',
      );
      _framesSinceReport = 0;
      _jankyFramesSinceReport = 0;
      _worstBuildMs = 0;
      _telemetryStartedAtMs = nowMs;
    });
  }

  void _onFrameTimings(List<FrameTiming> timings) {
    for (final timing in timings) {
      _framesSinceReport += 1;
      final buildMs = timing.buildDuration.inMicroseconds / 1000;
      final rasterMs = timing.rasterDuration.inMicroseconds / 1000;
      final totalMs = buildMs + rasterMs;
      if (totalMs > _worstBuildMs) _worstBuildMs = totalMs;
      // 16.7 ms is one 60 Hz frame; anything past it is a missed frame.
      if (totalMs > 20) _jankyFramesSinceReport += 1;
    }
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
    if (oldWidget.youtubeQueue != widget.youtubeQueue) {
      _youtubeItems = widget.youtubeQueue;
      _youtubeIndex = _youtubeItems.isEmpty ? null : 0;
    }
  }

  @override
  void dispose() {
    _frameTelemetryTimer?.cancel();
    SchedulerBinding.instance.removeTimingsCallback(_onFrameTimings);
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

  /// The next episode to play, or null when the episode queue is exhausted.
  PlaybackQueueItem? get _nextEpisodeItem {
    final index = _nextIndex;
    if (index == null || index < 0 || index >= _queue.length) return null;
    return _queue[index];
  }

  /// The next YouTube video to play, or null when its queue is exhausted.
  YoutubePlaybackItem? get _nextYoutubeItem {
    final index = _youtubeIndex;
    if (index == null || index < 0 || index >= _youtubeItems.length) return null;
    return _youtubeItems[index];
  }

  /// Whether a next item exists in either domain, which is what enables the
  /// skip-next control and the completed overlay's Next button.
  bool get _hasNext => _nextEpisodeItem != null || _nextYoutubeItem != null;

  /// The Up Next prompt is on screen (FR-3) and owns the remote (FR-4).
  bool get _upNextPromptVisible => _upNextSecondsLeft != null && _hasNext;

  /// Whether a full-screen prompt currently owns the remote.
  ///
  /// While one is up, the transport HUD underneath must not mount, answer
  /// Back, or move focus: doing so parked focus on controls hidden behind the
  /// prompt, which is exactly the device report of 2026-11-16 (arrows "do
  /// nothing", only a reboot gets out).
  bool _modalOwnsRemote(PlaybackState state) =>
      _adultPromptVisible ||
      _subtitlePickerVisible ||
      _upNextPromptVisible ||
      state.status == PlaybackStatus.completed;

  /// Big line of the Up Next card: `S01E02` for episodes, `YouTube` for a
  /// YouTube queue, empty when no card is due.
  String get _nextUpHeading {
    final episode = _nextEpisodeItem;
    if (episode != null) return episode.label;
    if (_nextYoutubeItem != null) return 'YouTube';
    return '';
  }

  /// Title line of the Up Next card.
  String get _nextUpTitle {
    final episode = _nextEpisodeItem;
    if (episode != null) return episode.title;
    final youtube = _nextYoutubeItem;
    if (youtube != null) return youtube.title;
    return '';
  }

  /// FR-3: autoplay applies to episodes and to a YouTube "Play all", and only
  /// when the viewer left the setting on.
  ///
  /// Fails **closed** while the preference is still unknown: an earlier version
  /// read the provider as "on" before it resolved, so a viewer who had turned
  /// autoplay off still got the next episode.
  bool get _autoplayAllowed {
    if (widget.nextEpisode != null) return false;
    if (widget.mediaType != 'episode' && widget.mediaType != 'youtube') {
      return false;
    }
    if (!_hasNext) return false;
    return _autoplayEnabled == true;
  }

  /// Shows the Up Next card and starts its countdown.
  void _startUpNext() {
    if (!_hasNext) return;
    // Never mount a focus-taking prompt over the subtitle picker: its autofocus
    // would steal the picker's focus (the picker re-checks when it closes).
    if (_subtitlePickerVisible) return;
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

  /// Starts the next item in either queue, in this route (FR-3 / YouTube Play all).
  Future<void> _advanceToNext() async {
    final episode = _nextEpisodeItem;
    final youtube = _nextYoutubeItem;
    if (episode == null && youtube == null) {
      _dismissUpNext();
      return;
    }
    _upNextTimer?.cancel();
    _upNextTimer = null;
    if (episode != null) {
      _currentItem = episode;
      _currentYoutubeItem = null;
      _nextIndex = _nextIndex! + 1;
      if (_nextIndex! >= _queue.length) _nextIndex = null;
    } else {
      _currentItem = null;
      _currentYoutubeItem = youtube;
      _youtubeIndex = _youtubeIndex! + 1;
      if (_youtubeIndex! >= _youtubeItems.length) _youtubeIndex = null;
    }
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
    final youtubeItem = _currentYoutubeItem;
    final mediaId = youtubeItem?.mediaId ?? item?.mediaId ?? widget.mediaId;
    final mediaType = widget.mediaType;
    final fallbackUrl = youtubeItem != null
        ? apiClient.youtubeStreamUrl(youtubeItem.mediaId)
        : item == null
            ? widget.streamUrl
            : _apiStreamUrl(mediaId);
    final fallbackTitle = youtubeItem?.title ??
        (item == null ? widget.title : item.label);

    _resolvedStreamUrl = fallbackUrl;
    _resolvedTitle = fallbackTitle;

    Duration resumeFrom = widget.resumeFrom;
    var externalSubtitles = <ExternalSubtitleSource>[];
    // The Adult library has no playback manifest: it has its own stream endpoint and progress store.
    // Asking for one produced a 422 and a noisy 'manifest failed' record on every play (device,
    // 2026-11-08 02:05), so the stream URL passed in is used as-is.
    // Neither the Adult nor the YouTube library has a playback manifest: both have their own
    // stream endpoints and progress stores.
    if (mediaType != 'adult' && mediaType != 'youtube') {
    // Resolve every provider BEFORE the await: the widget can be disposed while
    // the manifest request is in flight, and touching `ref` afterwards throws
    // "Cannot use ref after the widget was disposed" — measured on the device
    // 2026-11-19 (v122, /playback) when playback was interrupted during open.
    final errorReporter = ref.read(errorReporterProvider);
    final apiBaseUrl = ref.read(apiClientProvider).baseUrl ?? '';
    try {
      final manifest = await apiClient.getPlaybackManifest(
        mediaId: mediaId,
        type: mediaType,
      );
      if (manifest != null) {
        _resolvedStreamUrl = manifest.streamUrl.startsWith('http')
            ? manifest.streamUrl
            : '$apiBaseUrl${manifest.streamUrl}';
        _resolvedTitle = manifest.metadata.title;
        // Prefer the furthest known position: the manifest is authoritative for fresh data, while
        // the caller's value survives a failed/missing manifest response.
        final manifestResume = Duration(seconds: manifest.resume?.position ?? 0);
        resumeFrom = manifestResume > widget.resumeFrom ? manifestResume : widget.resumeFrom;
        externalSubtitles = manifest.subtitles
            .map(
              (track) => ExternalSubtitleSource(
                id: track.id,
                url: _resolveManifestUrl(track.url, apiBaseUrl),
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
      unawaited(errorReporter.report(
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

  /// Id of the item playing now: a YouTube video after "Play all" advanced,
  /// an episode after autoplay advanced, or the route's own media on entry.
  int get _activeMediaId =>
      _currentYoutubeItem?.mediaId ?? _currentItem?.mediaId ?? widget.mediaId;

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
      // Continue Watching is fetched once and then cached for the life of the
      // app, so Home kept offering the episode the owner had already left:
      // measured 2026-11-19, the server offered Archer S08E05 at 53.9% while
      // Home still showed S08E04 at 46%. Invalidate after the final progress
      // report has landed so Home offers the episode that just played.
      ref.invalidate(continueWatchingProvider);
      setState(() => _allowPop = true);
      navigator.pop();
    }
  }

  /// Offers the keep/delete decision once the adult item is effectively over.
  ///
  /// The server marks an adult item watched at 90% of its duration, so the same threshold opens this
  /// prompt: from that point the file is in the undecided queue anyway. It is raised at most once per
  /// session, never over the Up Next card, and never after the viewer already answered or deferred.
  void _maybeShowAdultDecision(PlaybackState state) {
    if (!_isAdultPlayback ||
        _subtitlePickerVisible ||
        _adultPromptVisible ||
        _adultPromptDismissed ||
        _adultDecision != null) {
      return;
    }
    if (state.status == PlaybackStatus.error || _upNextSecondsLeft != null) return;
    final completed = state.status == PlaybackStatus.completed;
    final nearlyDone = state.duration > Duration.zero &&
        state.position.inMilliseconds >= state.duration.inMilliseconds * 0.9;
    if (!completed && !nearlyDone) return;
    setState(() => _adultPromptVisible = true);
  }

  /// Writes the one durable decision for the adult item that just played.
  Future<void> _submitAdultDecision(String decision) async {
    final api = ref.read(apiClientProvider.notifier);
    await api.decideAdultItem(_activeMediaId, decision);
    if (!mounted) return;
    setState(() {
      _adultDecision = decision;
      _adultPromptDismissed = true;
    });
  }

  /// Back/Later: leave the item undecided; it stays in the "needs a decision" list.
  void _dismissAdultPrompt() {
    if (!mounted) return;
    if (_adultDecision != null) {
      _closeAdultPrompt();
      return;
    }
    setState(() {
      _adultPromptVisible = false;
      _adultPromptDismissed = true;
    });
  }

  /// Acknowledgement of a recorded decision. A deleted file cannot be replayed, so the screen exits;
  /// a kept file reveals the normal completed overlay again.
  void _closeAdultPrompt() {
    if (_adultDecision == 'delete') {
      _exitPlayback();
      return;
    }
    setState(() => _adultPromptVisible = false);
  }

  /// Opens the subtitle picker over the player (FR-4).
  void _openSubtitlePicker() {
    if (_subtitlePickerVisible) return;
    setState(() => _subtitlePickerVisible = true);
  }

  /// Closes the picker and puts the remote back on a visible control (FR-4).
  void _closeSubtitlePicker() {
    if (!_subtitlePickerVisible) return;
    setState(() => _subtitlePickerVisible = false);
    final service = ref.read(playbackServiceProvider.notifier);
    final state = ref.read(playbackServiceProvider);
    // The HUD's auto-hide window may have elapsed while the picker was up, so
    // its controls are unmounted and focus would otherwise land on the route
    // scope (invisible). Re-show the HUD to hand focus back to Play/Pause.
    if (state.status == PlaybackStatus.completed) {
      // A video can finish while the picker is open; offer the next one now
      // that the picker no longer owns the remote.
      if (_autoplayAllowed) {
        _startUpNext();
      }
      return;
    }
    _maybeShowAdultDecision(state);
    if (!_adultPromptVisible) {
      service.showOverlay();
    }
  }

  bool _handleKeyEvent(
    KeyEvent event,
    PlaybackService service,
    PlaybackState playbackState,
  ) {
    if (event is! KeyDownEvent) return false;
    final key = event.logicalKey;
    final isBack = key == LogicalKeyboardKey.goBack || key == LogicalKeyboardKey.escape;

    // The adult keep/delete prompt owns the remote while it is up. Arrows still walk its buttons
    // (they are handled deeper in the focus tree); Back here means "decide later", which dismisses
    // the prompt rather than leaving the screen or toggling the HUD underneath it.
    if (_adultPromptVisible) {
      if (isBack) {
        _dismissAdultPrompt();
        return true;
      }
      return false;
    }

    // The subtitle picker owns the remote while it is up (FR-4). Everything
    // except Back bubbles to its own rows; the HUD underneath must not react.
    if (_subtitlePickerVisible) {
      if (isBack) {
        _closeSubtitlePicker();
        return true;
      }
      return false;
    }

    // The Up Next prompt owns the remote while it is up (FR-4). Back answers it
    // exactly like Cancel, so the prompt always has an escape route; arrows and
    // Select keep walking its own two answers. Nothing here may seek the
    // finished stream or mount the HUD behind the scrim: that is what parked
    // focus on invisible controls and made the remote look dead.
    if (_upNextPromptVisible) {
      if (isBack) {
        _dismissUpNext();
        service.showOverlay();
        return true;
      }
      _cancelUpNextOnInput();
      return false;
    }

    // The completed overlay is the end state of playback. Back is its visible
    // Back action — leave playback — and no key may reach the HUD behind it.
    if (playbackState.status == PlaybackStatus.completed) {
      if (isBack) {
        _exitPlayback();
        return true;
      }
      return false;
    }

    // The error screen's visible Back action is the escape route; bind Back to
    // it too instead of toggling an unrendered HUD.
    if (playbackState.status == PlaybackStatus.error) {
      if (isBack) {
        _exitPlayback();
        return true;
      }
      return false;
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
    if (key == LogicalKeyboardKey.mediaFastForward) {
      service.seekRelative(const Duration(seconds: 30));
      return true;
    }
    if (key == LogicalKeyboardKey.mediaRewind) {
      service.seekRelative(const Duration(seconds: -30));
      return true;
    }
    if (key == LogicalKeyboardKey.goBack || key == LogicalKeyboardKey.escape) {
      if (_exitInProgress) return false;
      // Kodi style: Back toggles the overlay and is always consumed, so it can never pop the route.
      // Owner report 2026-11-08: Back ended the video instead of closing the HUD; the Stop button is
      // the deliberate exit affordance.
      if (playbackState.overlayVisible) {
        service.hideOverlay();
      } else {
        service.showOverlay();
      }
      return true;
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

    // Which full-screen surface currently owns the remote (FR-4). The HUD
    // underneath must not render while one is up: its controls are invisible
    // behind the scrim, so focus landing there looked like a dead remote.
    final upNextVisible = _upNextPromptVisible;
    final completedVisible = playbackState.status == PlaybackStatus.completed &&
        !upNextVisible &&
        !_adultPromptVisible &&
        !_subtitlePickerVisible;
    final modalOwnsRemote = _adultPromptVisible ||
        _subtitlePickerVisible ||
        upNextVisible ||
        completedVisible;

    // FR-8: when the overlay hides, its controls unmount and focus must
    // return to the key handler — otherwise the next press is lost.
    ref.listen<PlaybackState>(playbackServiceProvider, (previous, next) {
      if (previous?.overlayVisible != next.overlayVisible) {
        // The library ignores a rebuilt configuration; push the new padding instead so
        // cues stay bottom-justified when the HUD is hidden and clear the transport
        // row when it is up.
        _videoKey.currentState?.setSubtitleViewPadding(
          EdgeInsets.only(
            left: 48,
            right: 48,
            bottom: next.overlayVisible
                ? kSubtitleBottomPaddingOverlayVisible
                : kSubtitleBottomPaddingOverlayHidden,
          ),
        );
      }
      if (previous?.overlayVisible == true && !next.overlayVisible) {
        // Never pull focus while a prompt owns the remote: this used to park
        // focus on the playback root beneath an open prompt (owner report
        // 2026-11-16, the remote looked dead over the Up Next card / picker).
        if (!_modalOwnsRemote(next)) {
          _rootFocusNode.requestFocus();
        }
      }
      // FR-3: an episode that finishes offers the next one.
      if (previous?.status != PlaybackStatus.completed &&
          next.status == PlaybackStatus.completed) {
        if (_autoplayAllowed) {
          _startUpNext();
        }
      }
      // Retention (2026-11-11): an adult item that ends — or crosses the server's 90% watched
      // threshold — asks the owner to keep or delete it.
      _maybeShowAdultDecision(next);
    });

    return PopScope(
      // Android delivers Back as a route pop, so a Focus handler never sees it; intercept here.
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        // The keep/delete prompt gets Back first, so it can never be confused with the HUD.
        if (_adultPromptVisible) {
          _dismissAdultPrompt();
          return;
        }
        // Each modal answers Back with its own escape route (FR-4).
        if (_subtitlePickerVisible) {
          _closeSubtitlePicker();
          return;
        }
        if (_upNextPromptVisible) {
          _dismissUpNext();
          ref.read(playbackServiceProvider.notifier).showOverlay();
          return;
        }
        // Read live state: the closure's captured `playbackState` can be one frame stale after the
        // first Back showed the overlay, so a second Back appeared to do nothing.
        final live = ref.read(playbackServiceProvider.notifier);
        final state = ref.read(playbackServiceProvider);
        if (state.status == PlaybackStatus.completed ||
            state.status == PlaybackStatus.error) {
          // Back is the completed/error screen's visible Back action.
          _exitPlayback();
          return;
        }
        if (state.overlayVisible) {
          live.hideOverlay();
        } else {
          live.showOverlay();
        }
      },
      child: Scaffold(
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
            // Video surface — its own widget so the position tick (4-5 rebuilds a second)
            // does not rebuild the Texture/SurfaceView path. Rebuilding it every tick
            // showed up on the TV as framerate collapse after ~10 minutes of playback
            // (owner report 2026-11-21); a seek/pause rebuilt the surface and cleared it
            // for a few more minutes.
            Positioned.fill(
              child: _PlaybackVideoSurface(
                videoKey: _videoKey,
                controller: _videoController,
                overlayVisible: playbackState.overlayVisible,
              ),
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
            // It never renders under a prompt (FR-4) — see `modalOwnsRemote`.
            if (playbackState.overlayVisible &&
                playbackState.status != PlaybackStatus.error &&
                !modalOwnsRemote)
              _TransportOverlay(
                state: playbackState,
                service: service,
                title: playbackState.mediaTitle ?? _resolvedTitle,
                onStop: _exitPlayback,
                onBack: _exitPlayback,
                onShowSubtitlePicker: _openSubtitlePicker,
                // FR-3: a real skip-next when the queue has an item.
                nextEpisode:
                    widget.nextEpisode ?? (_hasNext ? _advanceToNext : null),
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
            if (upNextVisible && !_subtitlePickerVisible)
              _UpNextCard(
                heading: _nextUpHeading,
                title: _nextUpTitle,
                secondsLeft: _upNextSecondsLeft!,
                cancelled: _upNextCancelled,
                onPlayNow: _advanceToNext,
                onCancel: () {
                  _dismissUpNext();
                  service.showOverlay();
                },
              ),

            // Completed overlay. Hidden while the adult decision prompt is up so two surfaces never
            // compete for focus and the viewer answers one question at a time.
            if (completedVisible)
              _CompletedOverlay(
                onReplay: () => service.play(
                  streamUrl: _resolvedStreamUrl,
                  title: _resolvedTitle,
                  mediaId: _activeMediaId,
                  mediaType: widget.mediaType,
                  resumeFrom: Duration.zero,
                ),
                onNext:
                    widget.nextEpisode ?? (_hasNext ? _advanceToNext : null),
                onBack: _exitPlayback,
              ),

            // Retention (2026-11-11): the keep/delete choice for the adult item that just played.
            if (_adultPromptVisible)
              Positioned.fill(
                child: AdultDecisionPrompt(
                  title: _resolvedTitle,
                  onKeep: () => _submitAdultDecision('keep'),
                  onDelete: () => _submitAdultDecision('delete'),
                  onDone: _closeAdultPrompt,
                  onLater: _dismissAdultPrompt,
                ),
              ),

            // Subtitle picker (FR-4). Drawn inside this Stack instead of as a
            // separate dialog route so Back, focus and the HUD are all owned by
            // one state machine that can never leave the remote stranded.
            if (_subtitlePickerVisible)
              Positioned.fill(
                child: _SubtitlePickerDialog(
                  tracks: playbackState.subtitleTracks,
                  selectedIndex: playbackState.selectedSubtitleIndex,
                  onSelected: (index) {
                    service.selectSubtitle(index);
                    _closeSubtitlePicker();
                  },
                  onClose: _closeSubtitlePicker,
                ),
              ),
          ],
        ),
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
    required this.heading,
    required this.title,
    required this.secondsLeft,
    required this.cancelled,
    required this.onPlayNow,
    required this.onCancel,
  });

  /// `S01E02` for an episode, `YouTube` for the YouTube queue.
  final String heading;
  final String title;
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
                    heading,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 40,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    title,
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
    required this.onShowSubtitlePicker,
    this.nextEpisode,
  });

  final PlaybackState state;
  final PlaybackService service;
  final String title;
  final VoidCallback onStop;
  final VoidCallback onBack;

  /// Opens the subtitle picker, which the parent renders inside the playback
  /// Stack so the flow keeps one focus owner and one key handler (FR-4).
  final VoidCallback onShowSubtitlePicker;
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
                    // Owner request 2026-11-19: the wall clock rides the player
                    // overlay, in the same top-right cluster as Sync and Stop.
                    // It is information, not a D-pad stop (IgnorePointer), and
                    // it disappears with the HUD like everything else.
                    const Padding(
                      padding: EdgeInsets.only(right: 14),
                      child: IgnorePointer(
                        child: ExcludeSemantics(
                          child: DigitalClock(
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                        ),
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
                          onPressed: widget.onShowSubtitlePicker,
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
}

/// TV-first subtitle picker (FR-4).
///
/// Rendered inside the playback [Stack] instead of a `showDialog` route: the
/// picker then shares the playback route's key handler and focus tree, so Back
/// is answered here (not by a route scope), the HUD's auto-hide window can
/// never move focus out from under it, and an ended video can be deferred until
/// the picker closes. Every row is a [FocusableAction] with an explicit focus
/// node, and the first frame already has a control focused — the previous
/// dialog opened with the route scope focused, so the first Select did nothing.
class _SubtitlePickerDialog extends StatefulWidget {
  const _SubtitlePickerDialog({
    required this.tracks,
    required this.selectedIndex,
    required this.onSelected,
    required this.onClose,
  });

  final List<SubtitleTrackInfo> tracks;
  final int? selectedIndex;

  /// `null` turns subtitles off.
  final ValueChanged<int?> onSelected;
  final VoidCallback onClose;

  @override
  State<_SubtitlePickerDialog> createState() => _SubtitlePickerDialogState();
}

class _SubtitlePickerDialogState extends State<_SubtitlePickerDialog> {
  /// Explicit node rather than `autofocus`: the picker replaces the HUD the
  /// viewer was on, and a lost focus here silently toggles play/pause on the
  /// next Select.
  late final FocusNode _initialFocus;

  @override
  void initState() {
    super.initState();
    _initialFocus = FocusNode(debugLabel: 'SubtitlePicker.initial');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _initialFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _initialFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tracks = widget.tracks;
    // Focus the active choice, so the picker opens on the answer the viewer
    // already has and Up/Down walk the alternatives.
    final selected =
        widget.selectedIndex != null && widget.selectedIndex! < tracks.length
            ? widget.selectedIndex
            : null;
    return ColoredBox(
      color: const Color(0xCC000000),
      child: FocusScope(
        child: FocusTraversalGroup(
          policy: OrderedTraversalPolicy(),
          child: AlertDialog(
            backgroundColor: const Color(0xFF111111),
            title: const Text('Subtitles', style: TextStyle(color: Colors.white)),
            content: SizedBox(
              width: 380,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 400),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _row(
                        label: 'Off',
                        selected: selected == null,
                        focusNode: selected == null ? _initialFocus : null,
                        onSelect: () => widget.onSelected(null),
                      ),
                      for (var i = 0; i < tracks.length; i++)
                        _row(
                          label: _subtitleTrackLabel(tracks[i], i),
                          selected: selected == i,
                          focusNode: selected == i ? _initialFocus : null,
                          onSelect: () => widget.onSelected(i),
                        ),
                      if (tracks.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 12),
                          child: Text(
                            'No subtitle tracks available',
                            style: TextStyle(color: Colors.white70),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            actions: [
              FocusableAction(
                variant: FocusableActionVariant.button,
                borderRadius: 8,
                onSelect: widget.onClose,
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Text(
                    'Close',
                    style: TextStyle(color: Colors.white, fontSize: 18),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row({
    required String label,
    required bool selected,
    required VoidCallback onSelect,
    FocusNode? focusNode,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: FocusableAction(
        focusNode: focusNode,
        variant: FocusableActionVariant.button,
        borderRadius: 8,
        onSelect: onSelect,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF1F2937) : const Color(0xFF191919),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected ? MediarrColors.accentPrimary : Colors.white24,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 18),
                ),
              ),
              if (selected)
                const Icon(Icons.check, color: MediarrColors.accentPrimary),
            ],
          ),
        ),
      ),
    );
  }
}

String _subtitleTrackLabel(SubtitleTrackInfo track, int index) {
  final parts = <String>[
    if (track.title != null && track.title!.isNotEmpty) track.title!,
    if (track.language != null && track.language!.isNotEmpty) track.language!,
  ];
  final tag = parts.isEmpty ? 'Track ${index + 1}' : parts.join(' · ');
  return tag;
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

/// Fullscreen video surface.
///
/// Isolated from the playback screen's state so the position tick (4-5 rebuilds a
/// second, 4-5 more with the overlay up) never rebuilds the Texture/SurfaceView path.
/// The owner reported the framerate collapsing to 2-3 fps after ~10 minutes of
/// playback, recovering after a seek or pause — both of which rebuild this subtree —
/// and the constant rebuild churn is the part the client controls
/// (2026-11-21). `videoKey` is the `Video` state key used to push subtitle padding.
class _PlaybackVideoSurface extends StatelessWidget {
  const _PlaybackVideoSurface({
    required this.videoKey,
    required this.controller,
    required this.overlayVisible,
  });

  final GlobalKey<VideoState> videoKey;
  final VideoController? controller;
  final bool overlayVisible;

  @override
  Widget build(BuildContext context) {
    final videoController = controller;
    if (videoController == null) return const ColoredBox(color: Colors.black);
    return Video(
      key: videoKey,
      controller: videoController,
      controls: NoVideoControls,
      subtitleViewConfiguration:
          playbackSubtitleViewConfiguration(overlayVisible: overlayVisible),
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

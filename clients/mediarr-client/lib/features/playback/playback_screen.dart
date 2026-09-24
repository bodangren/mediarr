import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/services/api_client.dart';
import 'playback_service.dart';
import 'track_selection.dart';

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
    this.videoController,
  });

  final String streamUrl;
  final String title;
  final int mediaId;
  final String mediaType;

  /// Callback to play next episode (null if not applicable or last episode).
  final VoidCallback? nextEpisode;

  /// Optional [VideoController]. Production callers pass `null` and the
  /// screen builds one from the playback service's underlying player.
  /// Tests inject a controller or `null` to skip `media_kit`'s native
  /// surface entirely while exercising the transport overlay and the
  /// FR-6 / FR-7 widgets.
  final VideoController? videoController;

  @override
  ConsumerState<PlaybackScreen> createState() => _PlaybackScreenState();
}

class _PlaybackScreenState extends ConsumerState<PlaybackScreen> {
  VideoController? _videoController;
  final FocusNode _rootFocusNode = FocusNode(debugLabel: 'PlaybackScreen.root');
  late String _resolvedStreamUrl;
  late String _resolvedTitle;

  /// Suppresses Back-driven overlay toggles for one frame after a
  /// deliberate Stop so a Navigator.pop doesn't double-fire.
  bool _exitInProgress = false;

  @override
  void initState() {
    super.initState();
    _resolvedStreamUrl = widget.streamUrl;
    _resolvedTitle = widget.title;
    final service = ref.read(playbackServiceProvider.notifier);
    _videoController = widget.videoController;
    if (_videoController == null) {
      try {
        _videoController = VideoController(service.player);
      } catch (_) {
        _videoController = null;
      }
    }
    Future.microtask(_startPlayback);
  }

  @override
  void dispose() {
    _rootFocusNode.dispose();
    super.dispose();
  }

  Future<void> _startPlayback() async {
    final service = ref.read(playbackServiceProvider.notifier);
    final apiClient = ref.read(apiClientProvider.notifier);

    Duration resumeFrom = Duration.zero;
    try {
      final manifest = await apiClient.getPlaybackManifest(
        mediaId: widget.mediaId,
        type: widget.mediaType,
      );
      if (manifest != null) {
        final baseUrl = ref.read(apiClientProvider).baseUrl ?? '';
        _resolvedStreamUrl = manifest.streamUrl.startsWith('http')
            ? manifest.streamUrl
            : '$baseUrl${manifest.streamUrl}';
        _resolvedTitle = manifest.metadata.title;
        resumeFrom = Duration(seconds: manifest.resume?.position ?? 0);
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
      mediaId: widget.mediaId,
      mediaType: widget.mediaType,
      resumeFrom: resumeFrom,
    );
    if (mounted) {
      // Show the overlay briefly at start so the user knows where Back lands.
      service.showOverlay();
    }
  }

  void _exitPlayback() async {
    if (_exitInProgress) return;
    _exitInProgress = true;
    final navigator = Navigator.of(context);
    final service = ref.read(playbackServiceProvider.notifier);
    await service.stop();
    if (mounted) {
      navigator.pop();
    }
  }

  void _handleKeyEvent(KeyEvent event, PlaybackService service,
      PlaybackState playbackState) {
    if (event is! KeyDownEvent) return;
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.goBack || key == LogicalKeyboardKey.escape) {
      if (_exitInProgress) return;
      // Kodi style: Back toggles overlay. Back with overlay hidden shows
      // overlay (does NOT exit). A separate Stop affordance exits.
      if (playbackState.overlayVisible) {
        service.hideOverlay();
      } else {
        service.showOverlay();
      }
      return;
    }
    // Any other key (D-pad, arrows, select) wakes the overlay.
    if (!playbackState.overlayVisible) {
      service.showOverlay();
      return;
    }
    switch (key) {
      case LogicalKeyboardKey.select:
      case LogicalKeyboardKey.enter:
      case LogicalKeyboardKey.space:
        service.togglePlayPause();
        break;
      case LogicalKeyboardKey.arrowLeft:
        service.seekRelative(const Duration(seconds: -10));
        break;
      case LogicalKeyboardKey.arrowRight:
        service.seekRelative(const Duration(seconds: 10));
        break;
      case LogicalKeyboardKey.arrowUp:
      case LogicalKeyboardKey.arrowDown:
        // Wake the overlay; no other action needed.
        service.showOverlay();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final playbackState = ref.watch(playbackServiceProvider);
    final service = ref.read(playbackServiceProvider.notifier);

    return Scaffold(
      backgroundColor: Colors.black,
      body: KeyboardListener(
        focusNode: _rootFocusNode,
        autofocus: true,
        onKeyEvent: (event) =>
            _handleKeyEvent(event, service, playbackState),
        child: Stack(
          children: [
            // Video surface — always present, fullscreen.
            Positioned.fill(
              child: _videoController != null
                  ? Video(
                      controller: _videoController!,
                      controls: NoVideoControls,
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
                nextEpisode: widget.nextEpisode,
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

            // Completed overlay.
            if (playbackState.status == PlaybackStatus.completed)
              _CompletedOverlay(
                onReplay: () => service.play(
                  streamUrl: _resolvedStreamUrl,
                  title: _resolvedTitle,
                  mediaId: widget.mediaId,
                  mediaType: widget.mediaType,
                  resumeFrom: Duration.zero,
                ),
                onNext: widget.nextEpisode,
                onBack: _exitPlayback,
              ),
          ],
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
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 180),
      opacity: 1.0,
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
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      Text(
                        _formatDuration(state.duration),
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
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
                      const SizedBox(width: 24),
                      _IconActionButton(
                        icon: state.status == PlaybackStatus.playing
                            ? Icons.pause_circle_filled
                            : Icons.play_circle_filled,
                        size: 72,
                        color: MediarrColors.accentPrimary,
                        onPressed: service.togglePlayPause,
                      ),
                      const SizedBox(width: 24),
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
                      const SizedBox(width: 24),
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
    this.size = 36,
    this.color = Colors.white,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final String? tooltip;
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      onSelect: onPressed,
      variant: FocusableActionVariant.button,
      borderRadius: 8,
      scale: 1.04,
      child: Container(
        padding: const EdgeInsets.all(6),
        child: IconButton(
          tooltip: tooltip,
          icon: Icon(icon, color: color, size: size),
          onPressed: onPressed,
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
        trackHeight: 4,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
        activeTrackColor: MediarrColors.accentPrimary,
        inactiveTrackColor: Colors.white24,
        thumbColor: MediarrColors.accentPrimary,
      ),
      child: Slider(
        value: state.progress.clamp(0.0, 1.0),
        onChanged: (value) {
          final target = Duration(
            milliseconds: (value * state.duration.inMilliseconds).round(),
          );
          service.seekTo(target);
        },
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (final (label, step) in labels) ...[
            FocusableAction(
              onSelect: () => service.nudgeSubtitleDelay(step),
              variant: FocusableActionVariant.button,
              borderRadius: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  label,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
              ),
            ),
            const SizedBox(width: 6),
          ],
          FocusableAction(
            onSelect: () => service.resetSubtitleDelay(),
            variant: FocusableActionVariant.button,
            borderRadius: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'Reset',
                style: TextStyle(color: Colors.white, fontSize: 13),
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
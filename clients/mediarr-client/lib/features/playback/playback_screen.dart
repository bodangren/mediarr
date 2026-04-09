import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/services/api_client.dart';
import 'playback_service.dart';

/// Full-screen media player with transport overlay.
class PlaybackScreen extends ConsumerStatefulWidget {
  const PlaybackScreen({
    super.key,
    required this.streamUrl,
    required this.title,
    required this.mediaId,
    required this.mediaType,
    this.nextEpisode,
  });

  final String streamUrl;
  final String title;
  final int mediaId;
  final String mediaType;

  /// Callback to play next episode (null if not applicable or last episode).
  final VoidCallback? nextEpisode;

  @override
  ConsumerState<PlaybackScreen> createState() => _PlaybackScreenState();
}

class _PlaybackScreenState extends ConsumerState<PlaybackScreen> {
  late final VideoController _videoController;
  final FocusNode _focusNode = FocusNode();
  late String _resolvedStreamUrl;
  late String _resolvedTitle;

  @override
  void initState() {
    super.initState();
    _resolvedStreamUrl = widget.streamUrl;
    _resolvedTitle = widget.title;
    final service = ref.read(playbackServiceProvider.notifier);
    _videoController = VideoController(service.player);
    Future.microtask(_startPlayback);
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final playbackState = ref.watch(playbackServiceProvider);
    final service = ref.read(playbackServiceProvider.notifier);

    return Scaffold(
      backgroundColor: Colors.black,
      body: KeyboardListener(
        focusNode: _focusNode,
        autofocus: true,
        onKeyEvent: (event) => _handleKeyEvent(event, service, playbackState),
        child: GestureDetector(
          onTap: () => service.toggleOverlay(),
          child: Stack(
            children: [
              // Video surface
              Center(
                child: Video(
                  controller: _videoController,
                  controls: NoVideoControls,
                ),
              ),

              // Loading indicator
              if (playbackState.status == PlaybackStatus.loading ||
                  playbackState.status == PlaybackStatus.buffering)
                const Center(
                  child: CircularProgressIndicator(
                    color: MediarrColors.accentPrimary,
                  ),
                ),

              // Error state
              if (playbackState.status == PlaybackStatus.error)
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error, color: MediarrColors.statusError, size: 48),
                      const SizedBox(height: 12),
                      Text(
                        'Playback error',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: MediarrColors.textPrimary,
                            ),
                      ),
                      if (playbackState.error != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            playbackState.error!,
                            style: const TextStyle(color: MediarrColors.textMuted),
                          ),
                        ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Back'),
                      ),
                    ],
                  ),
                ),

              // Transport overlay
              if (playbackState.overlayVisible &&
                  playbackState.status != PlaybackStatus.error)
                _TransportOverlay(
                  state: playbackState,
                  service: service,
                  title: playbackState.mediaTitle ?? _resolvedTitle,
                  onBack: () async {
                    await service.stop();
                    if (context.mounted) Navigator.of(context).pop();
                  },
                  onNext: widget.nextEpisode,
                ),

              // Completed overlay
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
                  onBack: () async {
                    await service.stop();
                    if (context.mounted) Navigator.of(context).pop();
                  },
                ),
            ],
          ),
        ),
      ),
    );
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
        final baseUrl = apiClient.state.baseUrl ?? '';
        _resolvedStreamUrl = manifest.streamUrl.startsWith('http')
            ? manifest.streamUrl
            : '$baseUrl${manifest.streamUrl}';
        _resolvedTitle = manifest.metadata.title;
        resumeFrom = Duration(seconds: manifest.resume?.position ?? 0);
      }
    } catch (_) {
      // Manifest fetch is best-effort; fallback to route-provided stream URL.
    }

    if (!mounted) {
      return;
    }

    await service.play(
      streamUrl: _resolvedStreamUrl,
      title: _resolvedTitle,
      mediaId: widget.mediaId,
      mediaType: widget.mediaType,
      resumeFrom: resumeFrom,
    );
  }

  void _handleKeyEvent(
    KeyEvent event,
    PlaybackService service,
    PlaybackState playbackState,
  ) {
    if (event is! KeyDownEvent) return;

    switch (event.logicalKey) {
      case LogicalKeyboardKey.select:
      case LogicalKeyboardKey.enter:
      case LogicalKeyboardKey.space:
        if (playbackState.overlayVisible) {
          service.togglePlayPause();
        } else {
          service.showOverlay();
        }
      case LogicalKeyboardKey.arrowLeft:
        service.showOverlay();
        service.seekRelative(const Duration(seconds: -10));
      case LogicalKeyboardKey.arrowRight:
        service.showOverlay();
        service.seekRelative(const Duration(seconds: 10));
      case LogicalKeyboardKey.arrowUp:
      case LogicalKeyboardKey.arrowDown:
        service.showOverlay();
      case LogicalKeyboardKey.escape:
      case LogicalKeyboardKey.goBack:
        service.stop().then((_) {
          if (mounted) Navigator.of(context).pop();
        });
    }
  }
}

/// Transport controls overlay.
class _TransportOverlay extends StatelessWidget {
  const _TransportOverlay({
    required this.state,
    required this.service,
    required this.title,
    required this.onBack,
    this.onNext,
  });

  final PlaybackState state;
  final PlaybackService service;
  final String title;
  final VoidCallback onBack;
  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: 1.0,
      duration: const Duration(milliseconds: 200),
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xCC000000),
              Colors.transparent,
              Colors.transparent,
              Color(0xCC000000),
            ],
            stops: [0.0, 0.2, 0.7, 1.0],
          ),
        ),
        child: Column(
          children: [
            // Top bar: title + back
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: onBack,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            // Bottom bar: seek + controls
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Seek bar
                  _SeekBar(state: state, service: service),
                  const SizedBox(height: 8),
                  // Time display
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _formatDuration(state.position),
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                        ),
                      ),
                      Text(
                        _formatDuration(state.duration),
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Transport buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Rewind 10s
                      IconButton(
                        icon: const Icon(Icons.replay_10, color: Colors.white, size: 36),
                        onPressed: () =>
                            service.seekRelative(const Duration(seconds: -10)),
                      ),
                      const SizedBox(width: 24),
                      // Play/Pause
                      IconButton(
                        icon: Icon(
                          state.status == PlaybackStatus.playing
                              ? Icons.pause_circle_filled
                              : Icons.play_circle_filled,
                          color: MediarrColors.accentPrimary,
                          size: 56,
                        ),
                        onPressed: () => service.togglePlayPause(),
                      ),
                      const SizedBox(width: 24),
                      // Forward 10s
                      IconButton(
                        icon: const Icon(Icons.forward_10, color: Colors.white, size: 36),
                        onPressed: () =>
                            service.seekRelative(const Duration(seconds: 10)),
                      ),
                      if (onNext != null) ...[
                        const SizedBox(width: 24),
                        IconButton(
                          icon: const Icon(Icons.skip_next, color: Colors.white, size: 36),
                          onPressed: onNext,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Seek bar slider.
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
        overlayColor: MediarrColors.accentPrimary.withValues(alpha: 0.2),
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

/// Completed overlay with replay/next options.
class _CompletedOverlay extends StatelessWidget {
  const _CompletedOverlay({
    required this.onReplay,
    this.onNext,
    required this.onBack,
  });

  final VoidCallback onReplay;
  final VoidCallback? onNext;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xCC000000),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: MediarrColors.statusSuccess, size: 64),
            const SizedBox(height: 16),
            const Text(
              'Playback Complete',
              style: TextStyle(color: Colors.white, fontSize: 20),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ElevatedButton.icon(
                  icon: const Icon(Icons.replay),
                  label: const Text('Replay'),
                  onPressed: onReplay,
                ),
                const SizedBox(width: 16),
                if (onNext != null) ...[
                  ElevatedButton.icon(
                    icon: const Icon(Icons.skip_next),
                    label: const Text('Next Episode'),
                    onPressed: onNext,
                  ),
                  const SizedBox(width: 16),
                ],
                OutlinedButton(
                  onPressed: onBack,
                  child: const Text('Back to Library'),
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

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../shared/models/youtube_video.dart';
import '../../shared/services/api_client.dart';

/// YouTube library screen (track feature_youtube_library_20261107).
///
/// Grouped by channel, D-pad navigable, one focus stop per video. Selecting a video hands it to
/// `onSelect` so the caller owns playback; this screen never touches movie/episode playback state.
class YoutubeLibraryScreen extends StatefulWidget {
  const YoutubeLibraryScreen({
    super.key,
    required this.api,
    this.onSelect,
    this.baseUrl,
    this.autofocusFirst = true,
  });

  final MediarrApiClient api;
  final void Function(YoutubeVideo video)? onSelect;
  final String? baseUrl;
  final bool autofocusFirst;

  @override
  State<YoutubeLibraryScreen> createState() => _YoutubeLibraryScreenState();
}

class _YoutubeLibraryScreenState extends State<YoutubeLibraryScreen> {
  List<YoutubeVideo> _videos = const [];
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final videos = await widget.api.getYoutubeVideos();
      if (!mounted) return;
      setState(() => _videos = videos);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = 'Could not load YouTube: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _thumbUrl(YoutubeVideo video) {
    final thumb = video.thumbUrl;
    if (thumb.isEmpty) return null;
    final base = widget.baseUrl ?? '';
    return thumb.startsWith('http') ? thumb : '$base$thumb';
  }

  @override
  Widget build(BuildContext context) {
    final groups = <String, List<YoutubeVideo>>{};
    for (final video in _videos) {
      groups.putIfAbsent(video.channelName, () => []).add(video);
    }
    var firstFocusSeen = false;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text('YouTube',
                      style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 16),
                  Text('${_videos.length} videos',
                      style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 16)),
                ],
              ),
              const SizedBox(height: 16),
              if (_error != null)
                Text(_error!, style: const TextStyle(color: Color(0xFFF87171), fontSize: 16)),
              Expanded(
                child: _loading && _videos.isEmpty
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)))
                    : _videos.isEmpty
                        ? const Center(
                            child: Text('No downloaded videos yet',
                                style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 18)),
                          )
                        : ListView(
                            children: [
                              for (final entry in groups.entries) ...[
                                Padding(
                                  padding: const EdgeInsets.only(top: 8, bottom: 8),
                                  child: Text(
                                    '${entry.key.toUpperCase()} (${entry.value.length})',
                                    style: const TextStyle(
                                      color: Color(0xFF9CA3AF),
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                ),
                                // Row height must fit a 16:9 still + two title lines + duration; 168
                                // clipped the title into the next channel header (device, 2026-11-08).
                                SizedBox(
                                  height: 264,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: entry.value.length,
                                    separatorBuilder: (_, __) => const SizedBox(width: 16),
                                    itemBuilder: (context, index) {
                                      final video = entry.value[index];
                                      final autofocus = widget.autofocusFirst && !firstFocusSeen;
                                      firstFocusSeen = true;
                                      return _YoutubeCard(
                                        video: video,
                                        imageUrl: _thumbUrl(video),
                                        autofocus: autofocus,
                                        onSelect: () => widget.onSelect?.call(video),
                                      );
                                    },
                                  ),
                                ),
                              ],
                            ],
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _YoutubeCard extends StatelessWidget {
  const _YoutubeCard({
    required this.video,
    required this.imageUrl,
    required this.autofocus,
    required this.onSelect,
  });

  final YoutubeVideo video;
  final String? imageUrl;
  final bool autofocus;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return Focus(
      autofocus: autofocus,
      onKeyEvent: (node, event) {
        if (event is KeyDownEvent &&
            (event.logicalKey == LogicalKeyboardKey.select ||
                event.logicalKey == LogicalKeyboardKey.enter)) {
          onSelect();
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: Builder(
        builder: (focusContext) {
          final focused = Focus.of(focusContext).hasFocus;
          return AnimatedScale(
            scale: focused ? 1.02 : 1.0,
            duration: const Duration(milliseconds: 120),
            child: Material(
              color: const Color(0xFF111827),
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: onSelect,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 288,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: focused ? const Color(0xFFA78BFA) : const Color(0xFF262635),
                      width: focused ? 4 : 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AspectRatio(
                        aspectRatio: 16 / 9,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: imageUrl != null
                              ? Image.network(imageUrl!, fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const ColoredBox(color: Colors.black))
                              : const ColoredBox(color: Colors.black),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        video.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [video.durationLabel, if (video.isWatched) 'watched']
                            .where((value) => value.isNotEmpty)
                            .join(' · '),
                        style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/widgets/netflix_scaffold.dart';

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
  YoutubeQueueSummary? _queue;
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
    unawaited(_loadQueue());
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

  Future<void> _loadQueue() async {
    try {
      final queue = await widget.api.getYoutubeQueue();
      if (mounted) setState(() => _queue = queue);
    } catch (_) {
      // Queue health is a hint, never a reason to hide the library.
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
      final key = video.channelName == 'Uncategorized' ? 'Unsorted' : video.channelName;
      groups.putIfAbsent(key, () => []).add(video);
    }
    // Largest channels first: the storage bucket for files without a channel must not lead the page.
    final orderedGroups = groups.entries.toList()
      ..sort((a, b) => b.value.length.compareTo(a.value.length));
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
                  Text('· ${_videos.length} videos',
                      style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 18)),
                ],
              ),
              if (_queue != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '${_queue!.summaryLine} · downloads run every 20 minutes',
                    style: const TextStyle(color: Color(0xFF6B7280), fontSize: 15),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
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
                              for (final entry in orderedGroups) ...[
                                Padding(
                                  padding: const EdgeInsets.only(top: 8, bottom: 8),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${entry.key} · ${entry.value.length} ${entry.value.length == 1 ? 'video' : 'videos'}',
                                          style: const TextStyle(
                                            color: Color(0xFFD1D5DB),
                                            fontSize: 20,
                                            fontWeight: FontWeight.w600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      // A 90-video channel cannot be browsed comfortably in one
                                      // horizontal strip (owner review 2026-11-08); See all opens a
                                      // vertical list for that channel.
                                      FocusableAction(
                                        autofocus: false,
                                        variant: FocusableActionVariant.button,
                                        borderRadius: 8,
                                        onSelect: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => _ChannelVideosScreen(
                                              title: entry.key,
                                              videos: entry.value,
                                              thumbUrl: _thumbUrl,
                                              onSelect: widget.onSelect,
                                            ),
                                          ),
                                        ),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF111827),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: const Color(0xFF262635)),
                                          ),
                                          child: const Text(
                                            'See all',
                                            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // Row height must fit a 16:9 still + two title lines + duration; 168
                                // clipped the title into the next channel header (device, 2026-11-08).
                                SizedBox(
                                  height: 300,
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

class _NoPreview extends StatelessWidget {
  const _NoPreview();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0B1220),
      alignment: Alignment.center,
      child: const Text('No preview',
          style: TextStyle(color: Color(0xFF6B7280), fontSize: 13)),
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
                  width: 340,
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
                      Stack(
                        children: [
                          AspectRatio(
                            aspectRatio: 16 / 9,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: imageUrl != null
                                  ? Image.network(imageUrl!, fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const _NoPreview())
                                  : const _NoPreview(),
                            ),
                          ),
                          if (video.durationLabel.isNotEmpty)
                            Positioned(
                              right: 6,
                              bottom: 6,
                              // Solid pill: a faint grey duration was unreadable over bright stills.
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xCC000000),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(video.durationLabel,
                                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        video.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 19, height: 1.25, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        video.isWatched ? 'Watched' : '',
                        style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 15),
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


/// Vertical list for one YouTube channel (opened from "See all"), because large channels were stuck
/// in a single horizontal strip (owner review 2026-11-08).
class _ChannelVideosScreen extends StatelessWidget {
  const _ChannelVideosScreen({
    required this.title,
    required this.videos,
    required this.thumbUrl,
    this.onSelect,
  });

  final String title;
  final List<YoutubeVideo> videos;
  final String? Function(YoutubeVideo video) thumbUrl;
  final void Function(YoutubeVideo video)? onSelect;

  @override
  Widget build(BuildContext context) {
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
                  FocusableAction(
                    autofocus: true,
                    variant: FocusableActionVariant.button,
                    borderRadius: 8,
                    onSelect: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF111827),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF262635)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.arrow_back, color: Colors.white, size: 22),
                          SizedBox(width: 8),
                          Text('Back', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      '$title · ${videos.length} ${videos.length == 1 ? 'video' : 'videos'}',
                      style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.separated(
                  itemCount: videos.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final video = videos[index];
                    return Align(
                      alignment: Alignment.centerLeft,
                      child: _YoutubeCard(
                        video: video,
                        imageUrl: thumbUrl(video),
                        autofocus: index == 0,
                        onSelect: () => onSelect?.call(video),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

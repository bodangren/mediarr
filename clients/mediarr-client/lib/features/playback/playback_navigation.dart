import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import 'playback_queue.dart';
import 'playback_screen.dart' as ps;

/// Pushes [PlaybackScreen] as a fullscreen route outside the leanback
/// scaffold.
///
/// This is the supported entry point for playback from any browse screen.
/// It pushes onto the ROOT navigator (via `context.push('/playback', ...)`
/// when a GoRouter is in scope, otherwise via the rootNavigator fallback)
/// so the video surface gets the full screen and the sidebar does not
/// render behind it.
void openFullscreenPlayback(
  BuildContext context, {
  required String streamUrl,
  required String title,
  required int mediaId,
  required String mediaType,
  List<PlaybackQueueItem> queue = const [],
}) {
  // Production: go_router is in scope (mounted by main.dart). Push the
  // top-level /playback route, which is registered with parentNavigatorKey
  // = rootNavigatorKey so it lives outside the ShellRoute scaffold.
  if (GoRouter.maybeOf(context) != null) {
    context.push(
      AppRoutes.playback,
      extra: <String, dynamic>{
        'streamUrl': streamUrl,
        'title': title,
        'mediaId': mediaId,
        'mediaType': mediaType,
        // FR-3: the episode queue drives the Up Next countdown. It is a plain
        // list of value objects, so it survives the untyped route extra.
        'queue': queue,
      },
    );
    return;
  }
  // Test fallback: no GoRouter in scope. Use the rootNavigator to push
  // directly. Mirrors the production contract so this path works in both
  // worlds.
  final rootNavigator = Navigator.of(context, rootNavigator: true);
  rootNavigator.push(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => ps.PlaybackScreen(
        streamUrl: streamUrl,
        title: title,
        mediaId: mediaId,
        mediaType: mediaType,
        queue: queue,
      ),
    ),
  );
}

/// Reads the play queue out of the untyped `/playback` route extra (FR-3).
///
/// Any malformed entry is dropped rather than trusted, so a stale route can
/// never crash playback; an empty queue simply disables autoplay.
List<PlaybackQueueItem> readPlaybackQueueFromExtra(Object? extra) {
  if (extra is! Map) return const [];
  final raw = extra['queue'];
  if (raw is! List) return const [];
  final items = <PlaybackQueueItem>[];
  for (final entry in raw) {
    if (entry is PlaybackQueueItem) {
      items.add(entry);
      continue;
    }
    if (entry is Map) {
      final mediaId = entry['mediaId'];
      final title = entry['title'];
      final season = entry['seasonNumber'];
      final episode = entry['episodeNumber'];
      if (mediaId is int && title is String && season is int && episode is int) {
        items.add(PlaybackQueueItem(
          mediaId: mediaId,
          title: title,
          seasonNumber: season,
          episodeNumber: episode,
        ));
      }
    }
  }
  return items;
}
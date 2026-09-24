import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
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
      ),
    ),
  );
}
import 'package:http/http.dart' as http;

/// Assert that the server serves a valid ranged byte response for a movie.
Future<void> assertMovieStream(String baseUrl, int movieId) async {
  await _assertRangeRequest(
    baseUrl: baseUrl,
    url: '$baseUrl/api/stream/$movieId?type=movie',
    label: 'movie (id=$movieId)',
  );
}

/// Assert that the server serves a valid ranged byte response for an episode.
Future<void> assertEpisodeStream(String baseUrl, int episodeId) async {
  await _assertRangeRequest(
    baseUrl: baseUrl,
    url: '$baseUrl/api/stream/$episodeId?type=episode',
    label: 'episode (id=$episodeId)',
  );
}

Future<void> _assertRangeRequest({
  required String baseUrl,
  required String url,
  required String label,
}) async {
  const requestedBytes = 1024;
  final uri = Uri.parse(url);

  // ── Head range (bytes 0–1023) ──────────────────────────────────────────────
  final headResp = await http.get(
    uri,
    headers: {'Range': 'bytes=0-${requestedBytes - 1}'},
  );

  if (headResp.statusCode != 206) {
    throw AssertionError(
      'Stream $label: expected 206 Partial Content, got ${headResp.statusCode}.\n'
      'Body (first 200 chars): ${headResp.body.substring(0, headResp.body.length.clamp(0, 200))}',
    );
  }

  final contentType = headResp.headers['content-type'] ?? '';
  if (!contentType.contains('video/') && contentType != 'application/octet-stream') {
    throw AssertionError(
      'Stream $label: unexpected Content-Type "$contentType"',
    );
  }

  if (headResp.bodyBytes.length != requestedBytes) {
    throw AssertionError(
      'Stream $label: expected $requestedBytes bytes in head range, '
      'got ${headResp.bodyBytes.length}.',
    );
  }

  // ── Content-Range header sanity ─────────────────────────────────────────────
  final contentRange = headResp.headers['content-range'] ?? '';
  if (!contentRange.startsWith('bytes 0-${requestedBytes - 1}/')) {
    throw AssertionError(
      'Stream $label: Content-Range "$contentRange" does not start with '
      '"bytes 0-${requestedBytes - 1}/".',
    );
  }

  // Parse total file size from Content-Range: bytes 0-1023/TOTAL
  final totalStr = contentRange.split('/').lastOrNull ?? '';
  final total = int.tryParse(totalStr) ?? 0;

  if (total < requestedBytes) {
    throw AssertionError(
      'Stream $label: reported file size $total is less than $requestedBytes bytes.',
    );
  }

  // ── Tail range (last 512 bytes) ───────────────────────────────────────────
  const tailBytes = 512;
  final tailStart = total - tailBytes;
  final tailResp = await http.get(
    uri,
    headers: {'Range': 'bytes=$tailStart-${total - 1}'},
  );

  if (tailResp.statusCode != 206) {
    throw AssertionError(
      'Stream $label: tail range returned ${tailResp.statusCode}, expected 206.',
    );
  }

  if (tailResp.bodyBytes.length != tailBytes) {
    throw AssertionError(
      'Stream $label: expected $tailBytes bytes in tail range, '
      'got ${tailResp.bodyBytes.length}.',
    );
  }

  // ── Bytes differ (head ≠ tail for a real video) ──────────────────────────
  // Not guaranteed for a 2-second testsrc, so we skip this assertion — the
  // range delivery is what we're certifying.
}

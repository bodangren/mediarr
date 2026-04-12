import 'dart:convert';
import 'package:http/http.dart' as http;

const _expectedMovieTitle = 'Connectivity Test Movie';
const _expectedSeriesTitle = 'Connectivity Test Series';
const _expectedEpisodeTitle = 'Connectivity Pilot';

/// Assert the seeded movie is present in /api/movies.
/// Returns the movie ID for use in stream assertions.
Future<int> assertMovieLibrary(String baseUrl) async {
  final uri = Uri.parse('$baseUrl/api/movies?page=1&pageSize=100');
  final resp = await http.get(uri);
  if (resp.statusCode != 200) {
    throw AssertionError(
      'GET /api/movies returned ${resp.statusCode}: ${resp.body}',
    );
  }

  // Response shape: { "ok": true, "data": [...], "meta": {...} }
  final body = jsonDecode(resp.body) as Map<String, dynamic>;
  final items = (body['data'] as List?) ?? [];

  for (final item in items) {
    final m = item as Map<String, dynamic>;
    if ((m['title'] as String?) == _expectedMovieTitle) {
      return m['id'] as int;
    }
  }

  throw AssertionError(
    'Expected movie "$_expectedMovieTitle" not found in /api/movies. '
    'Got ${items.length} items.',
  );
}

/// Assert the seeded series + episode are reachable.
/// Returns the episode ID for use in stream assertions.
Future<int> assertSeriesLibrary(String baseUrl) async {
  // 1. Find the series
  final seriesUri = Uri.parse('$baseUrl/api/series?page=1&pageSize=100');
  final seriesResp = await http.get(seriesUri);
  if (seriesResp.statusCode != 200) {
    throw AssertionError(
      'GET /api/series returned ${seriesResp.statusCode}: ${seriesResp.body}',
    );
  }

  // Response shape: { "ok": true, "data": [...], "meta": {...} }
  final seriesBody = jsonDecode(seriesResp.body) as Map<String, dynamic>;
  final seriesList = (seriesBody['data'] as List?) ?? [];

  int? seriesId;
  for (final item in seriesList) {
    final s = item as Map<String, dynamic>;
    if ((s['title'] as String?) == _expectedSeriesTitle) {
      seriesId = s['id'] as int;
      break;
    }
  }

  if (seriesId == null) {
    throw AssertionError(
      'Expected series "$_expectedSeriesTitle" not found in /api/series.',
    );
  }

  // 2. Fetch detail and find the episode
  final detailUri = Uri.parse('$baseUrl/api/series/$seriesId');
  final detailResp = await http.get(detailUri);
  if (detailResp.statusCode != 200) {
    throw AssertionError(
      'GET /api/series/$seriesId returned ${detailResp.statusCode}',
    );
  }

  // Response shape: { "ok": true, "data": { "seasons": [...], ... } }
  final detail = jsonDecode(detailResp.body) as Map<String, dynamic>;
  final detailData = (detail['data'] as Map<String, dynamic>?) ?? detail;
  final seasons = (detailData['seasons'] as List?) ?? [];

  for (final season in seasons) {
    final s = season as Map<String, dynamic>;
    final eps = (s['episodes'] as List?) ?? [];
    for (final ep in eps) {
      final e = ep as Map<String, dynamic>;
      if ((e['title'] as String?) == _expectedEpisodeTitle) {
        return e['id'] as int;
      }
    }
  }

  throw AssertionError(
    'Expected episode "$_expectedEpisodeTitle" not found under series $seriesId.',
  );
}

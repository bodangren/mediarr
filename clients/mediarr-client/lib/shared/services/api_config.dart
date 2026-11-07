/// Process-wide base URL and remote-image handling for the client.
///
/// Android TV devices cannot reliably fetch third-party artwork directly, so
/// every remote image is routed through the Mediarr server's image proxy
/// (`GET /api/images/proxy?url=...`). The proxy is domain-allowlisted to TMDB
/// and TVDB on the server.
class ApiConfig {
  ApiConfig._();

  /// Base URL of the connected Mediarr server, e.g. `http://192.168.10.65:5174`.
  static String? baseUrl;

  /// Resolve a non-null [url] to an image the TV can actually load.
  ///
  /// - already on the server or a relative server path → unchanged
  /// - any other absolute http(s) URL → proxied by the server
  /// - any other string → unchanged
  static String image(String url) {
    if (url.isEmpty) return url;
    final base = baseUrl;
    if (base == null || base.isEmpty) return url;
    if (url.startsWith(base)) return url;
    if (url.startsWith('/')) return '$base$url';
    if (!url.startsWith('http://') && !url.startsWith('https://')) return url;
    return '$base/api/images/proxy?url=${Uri.encodeComponent(url)}';
  }

  /// Nullable convenience wrapper for optional artwork fields.
  static String? imageOrNull(String? url) => url == null ? null : image(url);
}

import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/services/api_config.dart';

void main() {
  setUp(() => ApiConfig.baseUrl = 'http://192.168.10.65:5174');
  tearDown(() => ApiConfig.baseUrl = null);

  test('null and empty stay null', () {
    expect(ApiConfig.imageOrNull(null), isNull);
    expect(ApiConfig.imageOrNull(''), '');
  });

  test('absolute third-party artwork is proxied', () {
    expect(
      ApiConfig.image('https://image.tmdb.org/t/p/w500/p.jpg'),
      'http://192.168.10.65:5174/api/images/proxy?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fp.jpg',
    );
  });

  test('relative server paths get the base URL, not a proxy wrap', () {
    expect(
      ApiConfig.image('/api/images/local.jpg'),
      'http://192.168.10.65:5174/api/images/local.jpg',
    );
  });

  test('URLs already on this server are left alone', () {
    const url = 'http://192.168.10.65:5174/api/images/proxy?url=x';
    expect(ApiConfig.image(url), url);
  });

  test('non-http strings are left alone', () {
    expect(ApiConfig.image('file:///tmp/p.jpg'), 'file:///tmp/p.jpg');
  });
}

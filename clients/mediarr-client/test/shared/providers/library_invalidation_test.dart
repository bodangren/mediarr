import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/features/library/series_screen.dart';
import 'package:mediarr_client/main.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mocktail/mocktail.dart';

class _MockApiClient extends Mock implements MediarrApiClient {}

void main() {
  late _MockApiClient client;
  late ProviderContainer container;

  setUp(() {
    client = _MockApiClient();
    when(() => client.getMoviesFiltered(
          search: any(named: 'search'),
          sortBy: any(named: 'sortBy'),
          sortAsc: any(named: 'sortAsc'),
          monitored: any(named: 'monitored'),
        )).thenAnswer((_) async => const <Movie>[]);
    when(() => client.getSeries()).thenAnswer((_) async => const <Series>[]);

    container = ProviderContainer(overrides: [
      apiClientProvider.overrideWith((ref) => client),
    ]);
    addTearDown(container.dispose);
  });

  test('invalidateLibraryProviders re-reads the movie list provider', () async {
    await container.read(moviesProvider.future);
    verify(() => client.getMoviesFiltered(
          search: any(named: 'search'),
          sortBy: any(named: 'sortBy'),
          sortAsc: any(named: 'sortAsc'),
          monitored: any(named: 'monitored'),
        )).called(1);

    invalidateLibraryProviders(container);

    await container.read(moviesProvider.future);
    // mocktail verifications consume their matches, so this second call(1) is
    // the fresh request the invalidation forced.
    verify(() => client.getMoviesFiltered(
          search: any(named: 'search'),
          sortBy: any(named: 'sortBy'),
          sortAsc: any(named: 'sortAsc'),
          monitored: any(named: 'monitored'),
        )).called(1);
  });

  test('invalidateLibraryProviders re-reads the series list provider', () async {
    await container.read(seriesListProvider.future);
    verify(() => client.getSeries()).called(1);

    invalidateLibraryProviders(container);

    await container.read(seriesListProvider.future);
    verify(() => client.getSeries()).called(1);
  });

  test('invalidating an unbuilt library provider is a no-op (cheap on every resume)', () {
    // No library provider has been read yet: the invalidation pass must not
    // throw and must not trigger any request.
    expect(() => invalidateLibraryProviders(container), returnsNormally);
    verifyNever(() => client.getSeries());
  });
}

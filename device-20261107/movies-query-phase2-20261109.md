# Movies server-backed search/sort/filter (TV 1.3.67 / code 91)

From the Kimi movies review: the screen fetched the whole library and filtered titles locally, with no
sort/filter controls.

## Implemented
- `MovieLibraryQuery` provider (search, sortBy title/year/added, sortAsc, monitored) drives
  `moviesProvider`; `getMoviesFiltered` calls `/api/movies` with the server's existing
  `search/sortBy/sortDir/monitored/page/pageSize` params and fetches all pages.
- Header: **Collections → View → Search**. View opens one TV context menu with checked options:
  Title A–Z, Year (newest), Recently added, All movies, Monitored, Unmonitored.
- Search is debounced (300 ms) and server-side; empty states distinguish library-empty vs no-match.
- Focus contract updated and tested: Up from grid → Collections, Right → View, Right → Search owns focus.

## Evidence
- `tv-movies-sort-filter-20261109.png`: 1.3.67 Movies View menu with the six options and current checks.
- Tests: library suite 75 tests green (including the updated D-pad walk + new query test); analyze clean.

Remaining movies phase work: Play filtered (ordered queue), retryable error/empty actions, focus restoration
after detail, detail Resume vs Start over and Delete confirmation.

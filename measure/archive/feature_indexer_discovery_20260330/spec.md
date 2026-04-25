# Spec: Indexer Auto-Discovery

## Context

Adding indexers currently requires the user to know the indexer URL, API key, and
configuration details. Mediarr ships 59 Cardigann definitions, but the settings UI
shows them as a flat list with no guidance on which are popular, which are free,
or which require paid API keys.

The zero-config vision requires that users can add indexers without research.
A curated list of popular indexers with pre-configured URLs and clear API key
instructions would eliminate the friction. Additionally, if the user already runs
Prowlarr or Jackett on their LAN, Mediarr should detect and offer to import from them.

## Requirements

### Curated Indexer Catalog
1. A `server/src/data/popular-indexers.json` file containing the top 10-15 most
   popular indexers with: name, type (torznab/newznab), base URL, categories,
   requiresApiKey (boolean), signupUrl, description.
2. The SPA "Add Indexer" flow shows this catalog as a grid of cards, grouped by
   type (Public / Semi-Private / Private).
3. For indexers requiring an API key, the card shows the signup URL and an inline
   API key input field. One-click "Add" after pasting the key.
4. For public/free indexers, one-click "Add" with no API key needed.

### LAN Service Detection
5. Scan common Prowlarr ports (9696) and Jackett ports (9117) on the LAN via
   HTTP probe (`GET /api/v1/system/status` for Prowlarr, `/api/v2.0/indexers`
   for Jackett).
6. If detected, show a banner: "Prowlarr detected at 192.168.x.x:9696 —
   Import indexers?" with a one-click import button.
7. Import fetches indexer definitions from Prowlarr/Jackett API and creates
   matching Mediarr indexers.

## Acceptance Criteria

- SPA "Add Indexer" shows curated catalog with popular indexers grouped by type.
- One-click add works for public indexers (no API key).
- API key indexers show signup URL and key input.
- Prowlarr/Jackett detection scans LAN on setup or settings visit.
- Detected services show import banner with one-click import.
- All catalog and detection endpoints have tests.
- `CI=true bun test` — all tests pass.
- `cd app && npm run build` — builds clean.

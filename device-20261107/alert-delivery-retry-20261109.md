# Alert delivery retry (B9, 2026-11-09)

`automation/dsh-media-automation/src/alerts.js` now implements the delivery half of B9 without
changing the local-first rule:

- `deliverPendingAlerts(db, { transport, maxAttempts })` walks PENDING ledger alerts, calls the
  transport, stamps `DELIVERED + delivered_at + attempts` on success, and increments `attempts` on
  failure; after **3 attempts** the row becomes FAILED for the watchdog to surface.
- With **no transport configured** it reports `reason: 'no transport configured'` and leaves alerts
  PENDING — the JSONL fallback remains the record; nothing is lost.
- `webhookTransport()` reads `MEDIA_AUTOMATION_ALERT_WEBHOOK` and POSTs the alert JSON (absent env ⇒
  no transport).
- Exposed to agent runs as `media_automation_deliver_alerts`.

## Tests (4 new, 23 in the plugin)
delivered + attempt recorded; retry-then-FAILED after max attempts; no-transport leaves PENDING;
webhook transport is null without URL and posts JSON with one.

## Remaining for B9's acceptance
Detection ≤10 min and delivery ≤15 min are scheduling properties: they need the plugin's timer once the
owner-gated harness cutover links it (B3/B4). The mechanism is now complete and tested.

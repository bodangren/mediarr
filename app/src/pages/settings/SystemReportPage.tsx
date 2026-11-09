import { RouteScaffold } from '@/components/primitives/RouteScaffold';

/**
 * The owner-facing Mediarr feature report inside the web app. It is a plain HTML page served by the
 * server at /reports/features.html (no-store) with a five-minute meta refresh, so the iframe shows the
 * same live document as the Chrome tab kept open for the owner.
 */
export function SystemReportPage() {
  return (
    <RouteScaffold
      title="System report"
      description="What the system can do, with recent improvements first. Refreshes every five minutes."
      actions={
        <a
          className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
          href="/reports/features.html"
          target="_blank"
          rel="noreferrer"
        >
          Open in a new tab
        </a>
      }
    >
      <iframe
        title="Mediarr system report"
        src="/reports/features.html"
        className="h-[75vh] w-full rounded-md border border-border-subtle bg-surface-1"
      />
    </RouteScaffold>
  );
}

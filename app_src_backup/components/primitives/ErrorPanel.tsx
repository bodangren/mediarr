interface ErrorPanelProps {
  title: string;
  body: string;
  onRetry?: () => void;
}

export function ErrorPanel({ title, body, onRetry }: ErrorPanelProps) {
  return (
    <section className="rounded-lg border border-status-error/40 bg-status-error/10 px-5 py-4">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{body}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-3 rounded-sm border border-status-error/60 px-2 py-1 text-xs font-medium text-text-primary hover:bg-status-error/20"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </section>
  );
}

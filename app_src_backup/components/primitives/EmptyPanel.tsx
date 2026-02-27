interface EmptyPanelProps {
  title: string;
  body: string;
}

export function EmptyPanel({ title, body }: EmptyPanelProps) {
  return (
    <section className="rounded-lg border border-dashed border-border-subtle bg-surface-1 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{body}</p>
    </section>
  );
}

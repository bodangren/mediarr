interface RouteScaffoldProps {
  title: string;
  description: string;
}

export function RouteScaffold({ title, description }: RouteScaffoldProps) {
  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-text-secondary">{description}</p>
      </header>
      <section className="rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary">
        This route is scaffolded for Prowlarr parity and will be progressively wired with feature-complete behavior.
      </section>
    </section>
  );
}

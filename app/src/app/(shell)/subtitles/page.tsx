import { EmptyPanel } from '@/components/primitives/EmptyPanel';

export default function SubtitlesPlaceholderPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Subtitles</h1>
        <p className="text-sm text-text-secondary">Subtitle console is delivered in Track 7D.</p>
      </header>

      <EmptyPanel
        title="Subtitle operations are staged"
        body="Track 7D adds live variant inventory, manual search, and download controls."
      />
    </section>
  );
}

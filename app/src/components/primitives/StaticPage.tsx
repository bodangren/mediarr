import { RouteScaffold } from '@/components/primitives/RouteScaffold';

export function StaticPage({ title, description }: { title: string; description: string }) {
  return <RouteScaffold title={title} description={description} />;
}

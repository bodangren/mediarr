import { Alert } from '@/components/ui/alert-compat';

interface EmptyPanelProps {
  title: string;
  body: string;
}

export function EmptyPanel({ title, body }: EmptyPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <Alert variant="info">
        <div className="flex flex-col gap-1 text-center">
          <p className="font-semibold">{title}</p>
          <p className="text-text-secondary">{body}</p>
        </div>
      </Alert>
    </div>
  );
}

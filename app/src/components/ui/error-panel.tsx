import { Alert } from '@/components/ui/alert-compat';
import { Button } from '@/components/ui/button';

interface ErrorPanelProps {
  title: string;
  body: string;
  onRetry?: () => void;
}

export function ErrorPanel({ title, body, onRetry }: ErrorPanelProps) {
  return (
    <Alert variant="danger">
      <div className="flex flex-col gap-2">
        <div>
          <p className="font-semibold text-text-primary">{title}</p>
          <p className="text-sm text-text-secondary">{body}</p>
        </div>
        {onRetry ? (
          <div>
            <Button
              variant="outline"
              size="sm"
              className="border-status-error/40 hover:bg-status-error/10"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </Alert>
  );
}

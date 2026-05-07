import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CustomFormat, CustomFormatTestResult } from '@/types/customFormat';

interface FormatLiveTesterProps {
  format: CustomFormat;
  onTest: (
    id: number,
    release: { title: string },
  ) => Promise<CustomFormatTestResult>;
}

export function FormatLiveTester({ format, onTest }: FormatLiveTesterProps) {
  const [title, setTitle] = useState('');
  const [result, setResult] = useState<CustomFormatTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const testResult = await onTest(format.id, { title: title.trim() });
      setResult(testResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleTest();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
          placeholder="Enter release title to test..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button
          onClick={handleTest}
          disabled={isLoading || !title.trim()}
          className="shrink-0"
        >
          {isLoading ? 'Testing...' : 'Test'}
        </Button>
      </div>

      {error && (
        <div className="rounded-sm border border-status-error bg-status-error/10 p-3 text-sm text-status-error">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div
            className={`rounded-sm border p-3 text-sm font-medium ${
              result.matches
                ? 'border-status-success bg-status-success/10 text-status-success'
                : 'border-status-error bg-status-error/10 text-status-error'
            }`}
          >
            {result.matches ? '✓ Match' : '✗ No Match'}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">Condition Results:</p>
            {result.conditionResults.map((condition, index) => (
              <div
                key={index}
                className={`flex items-center justify-between rounded-sm border p-2 text-sm ${
                  condition.matches
                    ? 'border-status-success/30 bg-status-success/5'
                    : 'border-status-error/30 bg-status-error/5'
                }`}
              >
                <span className="text-text-secondary">
                  {condition.field} {condition.operator} "{String(condition.value)}"
                </span>
                <span
                  className={
                    condition.matches ? 'text-status-success' : 'text-status-error'
                  }
                >
                  {condition.matches ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface ScoringBreakdown {
  customFormats: Array<{ id: number; name: string; score: number }>;
  customFormatScore: number;
  confidenceScore: number;
  indexerPriority: number;
  indexerScore: number;
  seeders: number;
  seedScore: number;
  totalScore: number;
}

interface ScoreBreakdownPanelProps {
  breakdown: ScoringBreakdown;
}

export function ScoreBreakdownPanel({ breakdown }: ScoreBreakdownPanelProps) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(breakdown, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className="space-y-3 rounded-sm border border-border-subtle bg-surface-0 p-4">
      {/* Total Score */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">Total Score</span>
        <span className="text-2xl font-bold text-accent-primary">{breakdown.totalScore}</span>
      </div>

      <div className="space-y-2">
        {/* Custom Formats */}
        <div className="rounded-sm border border-border-subtle p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-secondary">Custom Formats</span>
            <span className="text-sm font-medium text-accent-primary">+{breakdown.customFormatScore}</span>
          </div>
          {breakdown.customFormats.length === 0 ? (
            <p className="text-xs text-text-muted">No matching custom formats</p>
          ) : (
            <div className="space-y-1">
              {breakdown.customFormats.map(format => (
                <div key={format.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{format.name}</span>
                  <span className="text-status-success">+{format.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confidence */}
        <div className="rounded-sm border border-border-subtle p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Title Confidence</span>
            <span className="text-sm font-medium text-accent-primary">+{breakdown.confidenceScore}</span>
          </div>
        </div>

        {/* Indexer Priority */}
        <div className="rounded-sm border border-border-subtle p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Indexer Priority</span>
            <span className="text-sm font-medium text-accent-primary">+{breakdown.indexerScore}</span>
          </div>
          <p className="text-xs text-text-muted mt-1">Priority: {breakdown.indexerPriority}</p>
        </div>

        {/* Seeders */}
        <div className="rounded-sm border border-border-subtle p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Seeders</span>
            <span className="text-sm font-medium text-accent-primary">+{breakdown.seedScore}</span>
          </div>
          <p className="text-xs text-text-muted mt-1">{breakdown.seeders} peers</p>
        </div>
      </div>

      {/* JSON Toggle */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowJson(!showJson)}
        >
          {showJson ? 'Hide JSON' : 'Show JSON'}
        </Button>

        {showJson && (
          <div className="mt-2 space-y-2">
            <pre className="rounded-sm bg-surface-1 p-3 text-xs text-text-secondary overflow-auto max-h-48">
              {JSON.stringify(breakdown, null, 2)}
            </pre>
            <Button
              variant="outline"
              size="xs"
              onClick={handleCopyJson}
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

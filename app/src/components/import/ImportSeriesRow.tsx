'use client';

import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import type { DetectedSeries } from './types';

interface ImportSeriesRowProps {
  series: DetectedSeries;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onManualMatch: (series: DetectedSeries) => void;
  onImport: (series: DetectedSeries) => void;
}

export function ImportSeriesRow({ series, isSelected, onSelect, onManualMatch, onImport }: ImportSeriesRowProps) {
  const getStatusIcon = () => {
    switch (series.status) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 text-status-completed" title="Matched">
            <Icon name="success" label="Matched" />
            <span className="text-xs">Matched</span>
          </span>
        );
      case 'unmatched':
        return (
          <span className="inline-flex items-center gap-1 text-status-warning" title="Unmatched - Manual selection needed">
            <Icon name="warning" label="Unmatched" />
            <span className="text-xs">Unmatched</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-status-downloading" title="Pending">
            <Icon name="refresh" label="Pending" className="animate-pulse" />
            <span className="text-xs">Pending</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <tr className="border-b border-border-subtle hover:bg-surface-2">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(series.id)}
          aria-label={`Select ${series.folderName}`}
          disabled={series.status === 'unmatched'}
        />
      </td>
      <td className="px-3 py-3">
        <div>
          <p className="font-medium text-text-primary">{series.folderName}</p>
          {series.matchedSeriesTitle && series.matchedSeriesTitle !== series.folderName && (
            <p className="text-xs text-text-secondary">
              Matched as: {series.matchedSeriesTitle}
              {series.matchedSeriesYear && ` (${series.matchedSeriesYear})`}
            </p>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-text-secondary max-w-xs truncate" title={series.path}>
        {series.path}
      </td>
      <td className="px-3 py-3 text-sm text-text-secondary">
        {series.fileCount} file{series.fileCount !== 1 ? 's' : ''}
      </td>
      <td className="px-3 py-3">{getStatusIcon()}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {series.status === 'unmatched' && (
            <Button variant="secondary" onClick={() => onManualMatch(series)} className="text-xs">
              <Icon name="search" label="Search" className="mr-1" />
              Search
            </Button>
          )}
          {series.status === 'matched' && (
            <>
              <Button variant="secondary" onClick={() => onManualMatch(series)} className="text-xs">
                <Icon name="edit" label="Edit" className="mr-1" />
                Edit
              </Button>
              <Button variant="primary" onClick={() => onImport(series)} className="text-xs">
                Import
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

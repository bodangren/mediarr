'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Table } from '@/components/primitives/Table';
import { SelectProvider, useSelectContext } from '@/components/primitives/SelectProvider';
import { Button } from '@/components/primitives/Button';
import { EmptyPanel } from '@/components/primitives/EmptyPanel';
import { ImportSeriesRow } from './ImportSeriesRow';
import type { DetectedSeries } from './types';

interface ImportSeriesTableProps {
  detectedSeries: DetectedSeries[];
  onManualMatch: (series: DetectedSeries) => void;
  onImport: (series: DetectedSeries) => void;
  onBulkImport: (seriesIds: number[]) => void;
  backendSupported: boolean | null;
}

function TableHeader() {
  return (
    <thead className="bg-surface-2 text-left text-sm">
      <tr>
        <th className="w-10 px-3 py-3">
          <span className="sr-only">Select</span>
        </th>
        <th className="px-3 py-3 font-medium">Series Name</th>
        <th className="px-3 py-3 font-medium">Path</th>
        <th className="px-3 py-3 font-medium">Files</th>
        <th className="px-3 py-3 font-medium">Status</th>
        <th className="px-3 py-3 font-medium">Actions</th>
      </tr>
    </thead>
  );
}

function ImportSeriesTableContent({
  detectedSeries,
  onManualMatch,
  onImport,
  onBulkImport,
  backendSupported,
}: ImportSeriesTableProps) {
  const { selectedIds, isSelected, toggleRow, clearSelection } = useSelectContext();

  const selectableIds = useMemo(
    () => detectedSeries.filter(s => s.status === 'matched').map(s => s.id),
    [detectedSeries]
  );

  const matchedSeries = detectedSeries.filter(s => s.status === 'matched');

  if (detectedSeries.length === 0) {
    return (
      <EmptyPanel
        title="No series detected"
        body="Enter a folder path and click Scan to detect series in that location."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader />
        <tbody>
          {detectedSeries.map(series => (
            <ImportSeriesRow
              key={series.id}
              series={series}
              isSelected={isSelected(series.id)}
              onSelect={toggleRow}
              onManualMatch={onManualMatch}
              onImport={onImport}
              backendSupported={backendSupported}
            />
          ))}
        </tbody>
      </Table>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-1 px-4 py-3">
          <div className="text-sm text-text-secondary">
            {selectedIds.length} series selected for import
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={clearSelection}>
              Clear Selection
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onBulkImport(selectedIds as number[]);
                clearSelection();
              }}
              disabled={selectedIds.length === 0 || backendSupported === false}
              title={backendSupported === false ? 'Import requires backend support' : undefined}
            >
              Import Selected
            </Button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex gap-6 text-sm text-text-secondary">
        <span>
          <strong className="text-text-primary">{matchedSeries.length}</strong> ready to import
        </span>
        <span>
          <strong className="text-text-primary">
            {detectedSeries.filter(s => s.status === 'unmatched').length}
          </strong>{' '}
          need manual match
        </span>
      </div>
    </div>
  );
}

export function ImportSeriesTable(props: ImportSeriesTableProps): ReactNode {
  const selectableIds = useMemo(
    () => props.detectedSeries.filter(s => s.status === 'matched').map(s => s.id),
    [props.detectedSeries]
  );

  return (
    <SelectProvider rowIds={selectableIds}>
      <ImportSeriesTableContent {...props} />
    </SelectProvider>
  );
}

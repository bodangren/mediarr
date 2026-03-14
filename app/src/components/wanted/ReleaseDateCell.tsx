
export interface ReleaseDateCellProps {
  cinemaDate?: string;
  digitalDate?: string;
  physicalDate?: string;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ReleaseDateCell({ cinemaDate, digitalDate, physicalDate }: ReleaseDateCellProps) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div>
        <span className="text-text-secondary">Cinema:</span>{' '}
        <span className="text-text-primary">{formatDate(cinemaDate)}</span>
      </div>
      <div>
        <span className="text-text-secondary">Digital:</span>{' '}
        <span className="text-text-primary">{formatDate(digitalDate)}</span>
      </div>
      <div>
        <span className="text-text-secondary">Physical:</span>{' '}
        <span className="text-text-primary">{formatDate(physicalDate)}</span>
      </div>
    </div>
  );
}

ReleaseDateCell.formatDate = formatDate;

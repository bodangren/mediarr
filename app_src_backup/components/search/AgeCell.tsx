import { memo } from 'react';

interface AgeCellProps {
  ageHours: number;
  publishDate?: string;
}

function formatAge(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (hours < 24) {
    const roundedHours = Math.round(hours);
    return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }

  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''}`;
}

export const AgeCell = memo(function AgeCell({ ageHours, publishDate }: AgeCellProps) {
  const ageText = formatAge(ageHours);
  const title = publishDate ? `Published: ${new Date(publishDate).toLocaleString()}` : undefined;

  return (
    <span className="text-xs text-text-secondary" title={title}>
      {ageText}
    </span>
  );
});

import { memo, useState } from 'react';

interface ReleaseTitleProps {
  title: string;
  maxLines?: number;
}

export const ReleaseTitle = memo(function ReleaseTitle({ title, maxLines = 2 }: ReleaseTitleProps) {
  const [expanded, setExpanded] = useState(false);

  // Very long titles can be clipped, but check if it's likely to overflow
  const isLikelyLong = title.length > 60;

  if (!isLikelyLong) {
    return (
      <span className="font-mono text-xs break-all" title={title}>
        {title}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span
        className={`font-mono text-xs break-all ${expanded ? '' : `line-clamp-${maxLines}`}`}
        title={title}
      >
        {title}
      </span>
      <button
        type="button"
        className="text-xs text-accent-primary hover:underline"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
});

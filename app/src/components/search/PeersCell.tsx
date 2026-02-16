import { memo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface PeersCellProps {
  seeders?: number;
  leechers?: number;
}

export const PeersCell = memo(function PeersCell({ seeders, leechers }: PeersCellProps) {
  const hasSeeders = seeders !== undefined && seeders !== null;
  const hasLeechers = leechers !== undefined && leechers !== null;

  if (!hasSeeders && !hasLeechers) {
    return <span className="text-text-secondary">-</span>;
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      {hasSeeders && (
        <div className="flex items-center gap-1" title="Seeders">
          <ArrowUp className="text-green-400" size={14} />
          <span className={seeders > 0 ? 'text-green-400' : 'text-text-secondary'}>
            {seeders}
          </span>
        </div>
      )}
      {hasLeechers && (
        <div className="flex items-center gap-1" title="Leechers">
          <ArrowDown className="text-red-400" size={14} />
          <span className={leechers > 0 ? 'text-red-400' : 'text-text-secondary'}>
            {leechers}
          </span>
        </div>
      )}
    </div>
  );
});

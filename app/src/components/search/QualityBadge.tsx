import { memo } from 'react';

interface QualityBadgeProps {
  quality: {
    name: string;
    resolution: number;
  };
}

type QualityTier = 'high' | 'medium' | 'low';

function getQualityTier(resolution: number): QualityTier {
  if (resolution >= 2160) return 'high'; // 4K
  if (resolution >= 1080) return 'high'; // 1080p
  if (resolution >= 720) return 'medium'; // 720p
  return 'low';
}

const TIER_CLASSES: Record<QualityTier, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const QualityBadge = memo(function QualityBadge({ quality }: QualityBadgeProps) {
  const tier = getQualityTier(quality.resolution);
  const className = TIER_CLASSES[tier];

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${className}`}>
      {quality.name}
    </span>
  );
});

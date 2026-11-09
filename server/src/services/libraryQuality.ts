export interface QualityBreakdown {
  uhd4k: number;
  hd1080p: number;
  hd720p: number;
  sd: number;
  unknown: number;
}

export function categorizeQuality(quality: string | null | undefined): keyof QualityBreakdown {
  if (!quality) return 'unknown';
  const q = quality.toLowerCase();
  if (q.includes('4k') || q.includes('2160p') || q.includes('uhd')) return 'uhd4k';
  if (q.includes('1080p') || q.includes('1080i') || q.includes('1080')) return 'hd1080p';
  if (q.includes('720p') || q.includes('720')) return 'hd720p';
  if (q.includes('480p') || q.includes('dvd') || q.includes('sd') || q.includes('480')) return 'sd';
  return 'unknown';
}

export function buildQualityBreakdown(variants: Array<{ quality: string | null }>): QualityBreakdown {
  const breakdown: QualityBreakdown = { uhd4k: 0, hd1080p: 0, hd720p: 0, sd: 0, unknown: 0 };
  for (const variant of variants) {
    const bucket = categorizeQuality(variant.quality);
    breakdown[bucket] += 1;
  }
  return breakdown;
}

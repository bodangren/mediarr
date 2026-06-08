import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QualityBadge } from './QualityBadge';

describe('QualityBadge', () => {
  it('renders the quality name', () => {
    render(<QualityBadge quality={{ name: 'WEBDL-1080p', resolution: 1080 }} />);
    expect(screen.getByText('WEBDL-1080p')).toBeInTheDocument();
  });

  it('applies the high-tier (green) colour classes for resolution >= 1080', () => {
    render(<QualityBadge quality={{ name: 'Bluray-1080p', resolution: 1080 }} />);
    const badge = screen.getByText('Bluray-1080p');
    expect(badge.className).toMatch(/bg-green-500\/20/);
    expect(badge.className).toMatch(/text-green-400/);
    expect(badge.className).toMatch(/border-green-500\/30/);
  });

  it('applies the high-tier (green) colour classes for resolution >= 2160 (4K)', () => {
    render(<QualityBadge quality={{ name: 'Remux-2160p', resolution: 2160 }} />);
    const badge = screen.getByText('Remux-2160p');
    expect(badge.className).toMatch(/bg-green-500\/20/);
  });

  it('applies the medium-tier (yellow) colour classes for 720 <= resolution < 1080', () => {
    render(<QualityBadge quality={{ name: 'HDTV-720p', resolution: 720 }} />);
    const badge = screen.getByText('HDTV-720p');
    expect(badge.className).toMatch(/bg-yellow-500\/20/);
    expect(badge.className).toMatch(/text-yellow-400/);
    expect(badge.className).toMatch(/border-yellow-500\/30/);
  });

  it('applies the low-tier (gray) colour classes for resolution < 720', () => {
    render(<QualityBadge quality={{ name: 'SDTV-480p', resolution: 480 }} />);
    const badge = screen.getByText('SDTV-480p');
    expect(badge.className).toMatch(/bg-gray-500\/20/);
    expect(badge.className).toMatch(/text-gray-400/);
    expect(badge.className).toMatch(/border-gray-500\/30/);
  });
});

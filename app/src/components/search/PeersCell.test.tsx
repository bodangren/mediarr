import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PeersCell } from './PeersCell';

describe('PeersCell', () => {
  it('renders seeders and leechers when both are provided', () => {
    render(<PeersCell seeders={42} leechers={7} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByTitle('Seeders')).toBeInTheDocument();
    expect(screen.getByTitle('Leechers')).toBeInTheDocument();
  });

  it('renders a dash ("-") placeholder when both seeders and leechers are undefined', () => {
    render(<PeersCell />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders a dash ("-") placeholder when both seeders and leechers are null', () => {
    render(<PeersCell seeders={null} leechers={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders only seeders when leechers is omitted', () => {
    render(<PeersCell seeders={15} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByTitle('Seeders')).toBeInTheDocument();
    expect(screen.queryByTitle('Leechers')).not.toBeInTheDocument();
  });

  it('applies the green colour class to a positive seeder count and red to a positive leecher count', () => {
    render(<PeersCell seeders={10} leechers={3} />);

    expect(screen.getByText('10').className).toMatch(/text-green-400/);
    expect(screen.getByText('3').className).toMatch(/text-red-400/);
  });

  it('does not apply the green/red colour classes when the count is zero', () => {
    render(<PeersCell seeders={0} leechers={0} />);

    const seedersGroup = screen.getByTitle('Seeders');
    const leechersGroup = screen.getByTitle('Leechers');

    expect(within(seedersGroup).getByText('0').className).not.toMatch(/text-green-400/);
    expect(within(leechersGroup).getByText('0').className).not.toMatch(/text-red-400/);
  });
});

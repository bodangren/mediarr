import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlternateTitleTable } from './AlternateTitleTable';

const mockTitles = [
  { title: 'Origen', source: 'Spain' },
  { title: 'Начало', source: 'Russia' },
  { title: 'Yi Meng', source: 'Taiwan' },
];

describe('AlternateTitleTable', () => {
  it('renders list of alternate titles', () => {
    render(<AlternateTitleTable titles={mockTitles} />);

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Origen')).toBeInTheDocument();
    expect(screen.getByText('Spain')).toBeInTheDocument();
    expect(screen.getByText('Начало')).toBeInTheDocument();
    expect(screen.getByText('Russia')).toBeInTheDocument();
    expect(screen.getByText('Yi Meng')).toBeInTheDocument();
    expect(screen.getByText('Taiwan')).toBeInTheDocument();
  });

  it('shows empty message when no titles', () => {
    render(<AlternateTitleTable titles={[]} />);

    expect(screen.getByText('No alternate titles found')).toBeInTheDocument();
  });
});

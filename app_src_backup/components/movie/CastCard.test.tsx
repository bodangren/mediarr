import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CastCard } from './CastCard';

const mockCastMember = {
  id: 1,
  name: 'Leonardo DiCaprio',
  character: 'Dom Cobb',
  profileUrl: '/cast/dicaprio.jpg',
};

describe('CastCard', () => {
  it('renders cast member with profile image', () => {
    render(<CastCard cast={mockCastMember} />);

    expect(screen.getByAltText('Leonardo DiCaprio')).toBeInTheDocument();
    expect(screen.getByText('Leonardo DiCaprio')).toBeInTheDocument();
    expect(screen.getByText('Dom Cobb')).toBeInTheDocument();
  });

  it('renders placeholder when no profile image', () => {
    const castWithoutProfile = { ...mockCastMember, profileUrl: undefined };
    render(<CastCard cast={castWithoutProfile} />);

    expect(screen.queryByAltText('Leonardo DiCaprio')).not.toBeInTheDocument();
    expect(screen.getByText('Leonardo DiCaprio')).toBeInTheDocument();
    expect(screen.getByText('Dom Cobb')).toBeInTheDocument();
  });
});

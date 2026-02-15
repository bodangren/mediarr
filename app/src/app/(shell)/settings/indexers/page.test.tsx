import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsIndexersPage from './page';

vi.mock('../../indexers/page', () => ({
  default: () => <div data-testid="indexers-management-surface">Indexers Management</div>,
}));

describe('settings indexers page', () => {
  it('reuses the main indexers management surface', () => {
    render(<SettingsIndexersPage />);
    expect(screen.getByTestId('indexers-management-surface')).toBeInTheDocument();
  });
});

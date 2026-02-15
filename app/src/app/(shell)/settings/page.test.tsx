import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from './page';

vi.mock('./settings-form', () => ({
  SettingsForm: () => <div data-testid="settings-form">Settings Form</div>,
}));

describe('settings page', () => {
  it('renders settings header and form surface', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Indexers' })).toHaveAttribute('href', '/settings/indexers');
    expect(screen.getByTestId('settings-form')).toBeInTheDocument();
  });
});
